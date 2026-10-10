#include "automation_runtime.h"
#include "automation_engine.h"
#include "automation_sources.h"
#include "esp_log.h"
#include "esp_random.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "nvs.h"
#include "temperature_inputs.h"
#include "security_inputs.h"
#include "wifi_manager.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static SemaphoreHandle_t lock;
static automation_engine_t engine;
static cJSON *rules, *alerts, *profile, *committed_activation;
static bool configured;
static bool inputs_pending;
static bool storage_fault;
static unsigned sequence;
esp_err_t automation_runtime_export_storage(void **data, size_t *size) {
  if (!data || !size || !lock) return ESP_ERR_INVALID_ARG;
  *data = NULL;
  *size = 0;
  xSemaphoreTake(lock, portMAX_DELAY);
  nvs_handle_t handle;
  esp_err_t result = nvs_open("rv_automation", NVS_READONLY, &handle);
  if (result == ESP_OK) {
    size_t length = 0;
    result = nvs_get_blob(handle, "state", NULL, &length);
    if (result == ESP_OK && (!length || length > 65537)) result = ESP_ERR_INVALID_SIZE;
    if (result == ESP_OK) {
      void *bytes = malloc(length);
      if (!bytes) result = ESP_ERR_NO_MEM;
      else {
        result = nvs_get_blob(handle, "state", bytes, &length);
        if (result == ESP_OK) { *data = bytes; *size = length; }
        else free(bytes);
      }
    }
    nvs_close(handle);
  }
  xSemaphoreGive(lock);
  return result;
}
static const char *text(const cJSON *obj, const char *key) {
  const cJSON *v = cJSON_GetObjectItemCaseSensitive(obj, key);
  return cJSON_IsString(v) ? v->valuestring : "";
}
static esp_err_t save_state(const cJSON *next_rules, const cJSON *next_alerts, const char *transition_id, bool active) {
  if (storage_fault)
    return ESP_ERR_INVALID_STATE;
  cJSON *root = automation_engine_saved_state(&engine, next_rules, next_alerts, transition_id, active);
  if (!root) return ESP_ERR_NO_MEM;
  char *payload = cJSON_PrintUnformatted(root);
  cJSON *next_activation = cJSON_DetachItemFromObjectCaseSensitive(root, "activeRuleIds");
  cJSON_Delete(root);
  if (!payload || !next_activation) {
    cJSON_free(payload); cJSON_Delete(next_activation);
    return ESP_ERR_NO_MEM;
  }
  if (strlen(payload) > 65536) {
    cJSON_free(payload);
    cJSON_Delete(next_activation);
    return ESP_ERR_INVALID_SIZE;
  }
  nvs_handle_t handle;
  esp_err_t result = nvs_open("rv_automation", NVS_READWRITE, &handle);
  if (result == ESP_OK) {
    result = nvs_set_blob(handle, "state", payload, strlen(payload) + 1);
    if (result == ESP_OK)
      result = nvs_commit(handle);
    nvs_close(handle);
  }
  cJSON_free(payload);
  if (result == ESP_OK) {
    cJSON_Delete(committed_activation);
    committed_activation = next_activation;
  } else cJSON_Delete(next_activation);
  return result;
}
static bool alert(const char *message, const char *rule_id,
                  const char *severity, const char *transition_id, bool active) {
  cJSON *next = cJSON_Duplicate(alerts, true), *item = cJSON_CreateObject();
  if (!next || !item) {
    cJSON_Delete(next);
    cJSON_Delete(item);
    return false;
  }
  char id[33];
  snprintf(id, sizeof(id), "%08lx-%08x", (unsigned long)esp_random(),
           ++sequence);
  cJSON_AddStringToObject(item, "id", id);
  cJSON_AddStringToObject(item, "message", message);
  cJSON_AddStringToObject(item, "severity", severity);
  cJSON_AddStringToObject(item, "ruleId", rule_id);
  // Monotonic controller timestamp is honest before a wall clock is
  // synchronized.
  cJSON_AddNumberToObject(item, "uptimeMs", esp_timer_get_time() / 1000);
  cJSON_AddBoolToObject(item, "read", false);
  cJSON_InsertItemInArray(next, 0, item);
  while (cJSON_GetArraySize(next) > 64)
    cJSON_DeleteItemFromArray(next, 64);
  if (save_state(rules, next, transition_id, active) != ESP_OK) {
    cJSON_Delete(next);
    return false;
  }
  cJSON_Delete(alerts);
  alerts = next;
  return true;
}
static bool execute(const cJSON *rule, const cJSON *action, bool restoring,
                    void *context) {
  (void)context;
  if (!strcmp(text(action, "command"), "sendAlert") &&
      !strcmp(text(action, "target"), "notification")) {
    const char *message = text(action, restoring ? "restoreValue" : "value");
    return alert(*message ? message : text(rule, "name"), text(rule, "id"),
                 "info", text(rule, "id"), !restoring);
  }
  // A logical relay number is not a commissioned output driver. Report the gap,
  // retain pending activation, and retry rather than claiming physical success.
  char message[256];
  snprintf(message, sizeof(message),
           "%s: equipment output driver is not commissioned",
           text(rule, "name"));
  bool already_reported = false;
  const cJSON *existing;
  cJSON_ArrayForEach(
      existing,
      alerts) if (!strcmp(text(existing, "ruleId"), text(rule, "id")) &&
                  !strcmp(text(existing, "message"), message))
      already_reported = true;
  if (!already_reported)
    alert(message, text(rule, "id"), "warning", NULL, false);
  return false;
}
static cJSON *source_values(void) {
  cJSON *devices = temperature_inputs_to_json();
  cJSON *sources =
      automation_temperature_sources(profile, devices, inputs_pending);
  cJSON *contacts = security_inputs_to_json();
  automation_security_sources(sources, profile, contacts);
  cJSON_Delete(contacts);
  int minute = wifi_manager_local_minute();
  if (sources && minute >= 0)
    cJSON_AddNumberToObject(sources, "time.local", minute);
  cJSON_Delete(devices);
  return sources;
}
static void task(void *context) {
  (void)context;
  for (;;) {
    xSemaphoreTake(lock, portMAX_DELAY);
    if (configured && !storage_fault) {
      cJSON *sources = source_values();
      automation_engine_tick(&engine, rules, sources,
                             esp_timer_get_time() / 1000, execute, NULL);
      cJSON_Delete(sources);
      cJSON *after = automation_engine_export_activation(&engine, rules);
      if (!after || (!cJSON_Compare(committed_activation, after, true) &&
          save_state(rules, alerts, NULL, false) != ESP_OK)) storage_fault = true;
      cJSON_Delete(after);
    }
    xSemaphoreGive(lock);
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
void automation_runtime_inputs_pending(void) {
  xSemaphoreTake(lock, portMAX_DELAY);
  inputs_pending = true;
  xSemaphoreGive(lock);
}
void automation_runtime_configure(const diy_config_t *config) {
  cJSON *next = cJSON_Parse(config->features.profile_json);
  if (!next)
    return;
  xSemaphoreTake(lock, portMAX_DELAY);
  bool had_profile = profile != NULL;
  bool reset = configured != config->setup_complete ||
      automation_input_configuration_changed(profile, next);
  cJSON_Delete(profile);
  profile = next;
  configured = config->setup_complete;
  if (reset) {
    automation_engine_reset(&engine);
    if (had_profile && save_state(rules, alerts, NULL, false) != ESP_OK) storage_fault = true;
  }
  xSemaphoreGive(lock);
}
esp_err_t automation_runtime_start(const diy_config_t *config) {
  lock = xSemaphoreCreateMutex();
  if (!lock)
    return ESP_ERR_NO_MEM;
  rules = cJSON_CreateArray();
  alerts = cJSON_CreateArray();
  if (!rules || !alerts)
    return ESP_ERR_NO_MEM;
  cJSON *loaded_activation = NULL;
  nvs_handle_t handle;
  storage_fault = true;
  esp_err_t opened = nvs_open("rv_automation", NVS_READONLY, &handle);
  if (opened == ESP_ERR_NVS_NOT_FOUND)
    storage_fault = false;
  if (opened == ESP_OK) {
    size_t size = 0;
    esp_err_t loaded = nvs_get_blob(handle, "state", NULL, &size);
    if (loaded == ESP_ERR_NVS_NOT_FOUND)
      storage_fault = false;
    if (loaded == ESP_OK && size > 0 &&
        size <= 65537) {
      char *payload = malloc(size);
      if (payload && nvs_get_blob(handle, "state", payload, &size) == ESP_OK &&
          size > 0 && payload[size - 1] == '\0') {
        char error[96];
        cJSON *saved = automation_parse_saved_blob(payload, size, error, sizeof(error)),
              *saved_rules = cJSON_GetObjectItemCaseSensitive(saved, "rules"),
              *saved_alerts =
                  cJSON_GetObjectItemCaseSensitive(saved, "notifications");
        if (saved) {
          cJSON *loaded_rules = cJSON_Duplicate(saved_rules, true);
          cJSON *loaded_alerts = cJSON_Duplicate(saved_alerts, true);
          const cJSON *activation = cJSON_GetObjectItemCaseSensitive(saved, "activeRuleIds");
          if (cJSON_GetObjectItemCaseSensitive(saved, "version")->valuedouble == 2)
            loaded_activation = cJSON_Duplicate(activation, true);
          if (loaded_rules && loaded_alerts &&
              (cJSON_GetObjectItemCaseSensitive(saved, "version")->valuedouble == 1 || loaded_activation)) {
            cJSON_Delete(rules);
            cJSON_Delete(alerts);
            rules = loaded_rules;
            alerts = loaded_alerts;
            storage_fault = false;
          } else {
            cJSON_Delete(loaded_rules);
            cJSON_Delete(loaded_alerts);
            ESP_LOGW("automation",
                     "Insufficient memory to restore automation state");
          }
        } else
          ESP_LOGW("automation",
                   "Stored automation state is invalid; original retained and automation disabled");
        cJSON_Delete(saved);
      }
      free(payload);
    }
    nvs_close(handle);
  }
  automation_runtime_configure(config);
  if (loaded_activation && !automation_engine_restore_activation(&engine, rules, loaded_activation))
    storage_fault = true;
  cJSON_Delete(loaded_activation);
  committed_activation = automation_engine_export_activation(&engine, rules);
  if (!committed_activation) return ESP_ERR_NO_MEM;
  return xTaskCreate(task, "automation", 6144, NULL, 3, NULL) == pdPASS
             ? ESP_OK
             : ESP_ERR_NO_MEM;
}
bool automation_runtime_control(const cJSON *command, char *error,
                                size_t error_len) {
  bool success = false;
  const char *type = text(command, "type"), *id = text(command, "id");
  xSemaphoreTake(lock, portMAX_DELAY);
  if (storage_fault) {
    if (error && error_len)
      snprintf(error, error_len, "Saved automation data could not be loaded; original retained. Storage recovery is required before editing rules.");
    xSemaphoreGive(lock);
    return false;
  }
  cJSON *next_rules = cJSON_Duplicate(rules, true),
        *next_alerts = cJSON_Duplicate(alerts, true);
  if (!next_rules || !next_alerts)
    goto finish;
  if (!strcmp(type, "notification.acknowledge")) {
    cJSON *item;
    cJSON_ArrayForEach(item, next_alerts) if (!strcmp(text(item, "id"), id)) {
      cJSON_ReplaceItemInObjectCaseSensitive(item, "read",
                                             cJSON_CreateBool(true));
      success = true;
      break;
    }
  } else if (!strcmp(type, "automation.upsert")) {
    const cJSON *rule = cJSON_GetObjectItemCaseSensitive(command, "rule");
    if (!automation_validate_rule(rule, error, error_len))
      goto finish;
    int index = 0;
    cJSON *item;
    bool found = false;
    cJSON_ArrayForEach(item, next_rules) {
      if (!strcmp(text(item, "id"), text(rule, "id"))) {
        cJSON_ReplaceItemInArray(next_rules, index,
                                 cJSON_Duplicate(rule, true));
        found = true;
        break;
      }
      index++;
    }
    if (!found) {
      cJSON_AddItemToArray(next_rules, cJSON_Duplicate(rule, true));
    }
    success = true;
  } else if (!strcmp(type, "automation.delete") ||
             !strcmp(type, "automation.setEnabled")) {
    int index = 0;
    cJSON *item;
    cJSON_ArrayForEach(item, next_rules) {
      if (!strcmp(text(item, "id"), id)) {
        if (!strcmp(type, "automation.delete"))
          cJSON_DeleteItemFromArray(next_rules, index);
        else {
          const cJSON *enabled =
              cJSON_GetObjectItemCaseSensitive(command, "enabled");
          if (!cJSON_IsBool(enabled))
            goto finish;
          cJSON_ReplaceItemInObjectCaseSensitive(
              item, "enabled", cJSON_Duplicate(enabled, true));
        }
        success = true;
        break;
      }
      index++;
    }
  }
  if (success)
    success = automation_validate_rules(next_rules, error, error_len);
  if (success && save_state(next_rules, next_alerts,
      !strcmp(type, "notification.acknowledge") ? NULL :
      !strcmp(type, "automation.upsert") ? text(cJSON_GetObjectItemCaseSensitive(command, "rule"), "id") : id, false) != ESP_OK) {
    snprintf(error, error_len,
             "Controller storage failed; changes were not applied");
    success = false;
  }
  if (success) {
    cJSON_Delete(rules);
    cJSON_Delete(alerts);
    rules = next_rules;
    alerts = next_alerts;
    next_rules = NULL;
    next_alerts = NULL;
    if (strncmp(type, "notification.", 13))
      automation_engine_reset_rule(
          &engine,
          !strcmp(type, "automation.upsert")
              ? text(cJSON_GetObjectItemCaseSensitive(command, "rule"), "id")
              : id);
  }
finish:
  cJSON_Delete(next_rules);
  cJSON_Delete(next_alerts);
  xSemaphoreGive(lock);
  if (!success && error && error_len && !error[0]) {
    snprintf(error, error_len, "Rule or notification was not found");
  }
  return success;
}
void automation_runtime_append(cJSON *telemetry) {
  xSemaphoreTake(lock, portMAX_DELAY);
  if (storage_fault)
    cJSON_AddStringToObject(telemetry, "storageError",
      "Saved automation data could not be loaded. Original retained; automation and rule edits are disabled pending storage recovery.");
  cJSON *runtime = cJSON_CreateObject();
  for (size_t i = 0; i < DIY_AUTOMATION_MAX_RULES; ++i) {
    const automation_rule_state_t *state = &engine.rules[i];
    if (!state->id[0])
      continue;
    cJSON *item = cJSON_CreateObject();
    cJSON_AddBoolToObject(item, "active", state->active);
    cJSON_AddBoolToObject(item, "holding", state->holding);
    cJSON_AddBoolToObject(item, "sourceAvailable", state->input_available);
    if (state->retry_ms)
      cJSON_AddStringToObject(item, "error",
                              "Action failed; review notifications. Retrying.");
    cJSON_AddItemToObject(runtime, state->id, item);
  }
  cJSON_DeleteItemFromObjectCaseSensitive(telemetry, "ruleRuntime");
  cJSON_AddItemToObject(telemetry, "ruleRuntime", runtime);
  cJSON_DeleteItemFromObjectCaseSensitive(telemetry, "automationRules");
  cJSON_AddItemToObject(telemetry, "automationRules",
                        cJSON_Duplicate(rules, true));
  cJSON_AddItemToObject(telemetry, "notifications",
                        cJSON_Duplicate(alerts, true));
  cJSON *controller = cJSON_GetObjectItemCaseSensitive(telemetry, "controller");
  int unread = 0;
  const cJSON *item;
  cJSON_ArrayForEach(
      item,
      alerts) if (!cJSON_IsTrue(cJSON_GetObjectItemCaseSensitive(item, "read")))
      unread++;
  cJSON_ReplaceItemInObjectCaseSensitive(controller, "alerts",
                                         cJSON_CreateNumber(unread));
  cJSON_AddStringToObject(controller, "equipmentMode", "prototype-simulation");
  xSemaphoreGive(lock);
}
