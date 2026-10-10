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
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static SemaphoreHandle_t lock;
static automation_engine_t engine;
static cJSON *rules, *alerts, *profile;
static bool configured;
static bool inputs_pending;
static unsigned sequence;
static const char *text(const cJSON *obj, const char *key) {
  const cJSON *v = cJSON_GetObjectItemCaseSensitive(obj, key);
  return cJSON_IsString(v) ? v->valuestring : "";
}
static esp_err_t save_state(const cJSON *next_rules, const cJSON *next_alerts) {
  cJSON *root = cJSON_CreateObject();
  cJSON *rules_copy = cJSON_Duplicate(next_rules, true);
  cJSON *alerts_copy = cJSON_Duplicate(next_alerts, true);
  if (!root || !rules_copy || !alerts_copy) {
    cJSON_Delete(root);
    cJSON_Delete(rules_copy);
    cJSON_Delete(alerts_copy);
    return ESP_ERR_NO_MEM;
  }
  cJSON_AddNumberToObject(root, "version", 1);
  cJSON_AddItemToObject(root, "rules", rules_copy);
  cJSON_AddItemToObject(root, "notifications", alerts_copy);
  char *payload = cJSON_PrintUnformatted(root);
  cJSON_Delete(root);
  if (!payload)
    return ESP_ERR_NO_MEM;
  if (strlen(payload) > 65536) {
    cJSON_free(payload);
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
  return result;
}
static bool alert(const char *message, const char *rule_id,
                  const char *severity) {
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
  if (save_state(rules, next) != ESP_OK) {
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
                 "info");
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
    alert(message, text(rule, "id"), "warning");
  return false;
}
static cJSON *source_values(void) {
  cJSON *devices = temperature_inputs_to_json();
  cJSON *sources =
      automation_temperature_sources(profile, devices, inputs_pending);
  cJSON_Delete(devices);
  return sources;
}
static void task(void *context) {
  (void)context;
  for (;;) {
    xSemaphoreTake(lock, portMAX_DELAY);
    if (configured) {
      cJSON *sources = source_values();
      automation_engine_tick(&engine, rules, sources,
                             esp_timer_get_time() / 1000, execute, NULL);
      cJSON_Delete(sources);
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
  cJSON_Delete(profile);
  profile = next;
  configured = config->setup_complete;
  automation_engine_reset(&engine);
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
  nvs_handle_t handle;
  if (nvs_open("rv_automation", NVS_READONLY, &handle) == ESP_OK) {
    size_t size = 0;
    if (nvs_get_blob(handle, "state", NULL, &size) == ESP_OK && size > 0 &&
        size <= 65537) {
      char *payload = malloc(size);
      if (payload && nvs_get_blob(handle, "state", payload, &size) == ESP_OK &&
          size > 0 && payload[size - 1] == '\0') {
        cJSON *saved = cJSON_ParseWithLengthOpts(payload, size, NULL, true),
              *saved_rules = cJSON_GetObjectItemCaseSensitive(saved, "rules"),
              *saved_alerts =
                  cJSON_GetObjectItemCaseSensitive(saved, "notifications");
        char error[96];
        if (automation_validate_saved_state(saved, error, sizeof(error))) {
          cJSON *loaded_rules = cJSON_Duplicate(saved_rules, true);
          cJSON *loaded_alerts = cJSON_Duplicate(saved_alerts, true);
          if (loaded_rules && loaded_alerts) {
            cJSON_Delete(rules);
            cJSON_Delete(alerts);
            rules = loaded_rules;
            alerts = loaded_alerts;
          } else {
            cJSON_Delete(loaded_rules);
            cJSON_Delete(loaded_alerts);
            ESP_LOGW("automation",
                     "Insufficient memory to restore automation state");
          }
        } else
          ESP_LOGW("automation",
                   "Stored automation state is invalid; using empty inventory");
        cJSON_Delete(saved);
      }
      free(payload);
    }
    nvs_close(handle);
  }
  automation_runtime_configure(config);
  return xTaskCreate(task, "automation", 6144, NULL, 3, NULL) == pdPASS
             ? ESP_OK
             : ESP_ERR_NO_MEM;
}
bool automation_runtime_control(const cJSON *command, char *error,
                                size_t error_len) {
  bool success = false;
  const char *type = text(command, "type"), *id = text(command, "id");
  xSemaphoreTake(lock, portMAX_DELAY);
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
  if (success && save_state(next_rules, next_alerts) != ESP_OK) {
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
      automation_engine_reset(&engine);
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
