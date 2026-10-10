#include "automation_sources.h"
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static const char *text(const cJSON *object, const char *key) {
  const cJSON *value = cJSON_GetObjectItemCaseSensitive(object, key);
  return cJSON_IsString(value) ? value->valuestring : "";
}
static bool enabled(const cJSON *item) {
  return cJSON_IsTrue(cJSON_GetObjectItemCaseSensitive(item, "enabled"));
}
static bool same_address(const char *a, const char *b) {
  if (strlen(a) != strlen(b))
    return false;
  while (*a) {
    if (tolower((unsigned char)*a++) != tolower((unsigned char)*b++))
      return false;
  }
  return true;
}
cJSON *automation_temperature_sources(const cJSON *profile,
                                      const cJSON *devices,
                                      bool inputs_pending) {
  cJSON *sources = cJSON_CreateObject();
  if (!sources || inputs_pending)
    return sources;
  const cJSON *sensor;
  cJSON_ArrayForEach(
      sensor, cJSON_GetObjectItemCaseSensitive(profile, "temperatureZones")) {
    if (!enabled(sensor))
      continue;
    char key[128];
    snprintf(key, sizeof(key), "temperature.%s.tempF", text(sensor, "id"));
    const cJSON *reading = NULL, *device;
    if (!strcmp(text(sensor, "sensorType"), "ds18b20") &&
        *text(sensor, "address") && *text(sensor, "busId")) {
      cJSON_ArrayForEach(device,
                         cJSON_GetObjectItemCaseSensitive(devices, "devices")) {
        if (same_address(text(device, "address"), text(sensor, "address")) &&
            !strcmp(text(device, "busId"), text(sensor, "busId"))) {
          reading = device;
          break;
        }
      }
    }
    const cJSON *age = cJSON_GetObjectItemCaseSensitive(reading, "ageMs"),
                *value = cJSON_GetObjectItemCaseSensitive(reading, "tempF");
    if (!strcmp(text(reading, "status"), "ok") && cJSON_IsNumber(age) &&
        age->valuedouble >= 0 && age->valuedouble <= 30000 &&
        cJSON_IsNumber(value) && isfinite(value->valuedouble))
      cJSON_AddNumberToObject(sources, key, value->valuedouble);
    else
      cJSON_AddNullToObject(sources, key);
  }
  const cJSON *zone;
  cJSON_ArrayForEach(zone,
                     cJSON_GetObjectItemCaseSensitive(profile, "hvacZones")) {
    if (!enabled(zone))
      continue;
    char key[128], sensor_key[128];
    snprintf(key, sizeof(key), "hvac.%s.tempF", text(zone, "id"));
    snprintf(sensor_key, sizeof(sensor_key), "temperature.%s.tempF",
             text(zone, "temperatureSensorId"));
    const cJSON *value = cJSON_GetObjectItemCaseSensitive(sources, sensor_key);
    if (cJSON_IsNumber(value))
      cJSON_AddNumberToObject(sources, key, value->valuedouble);
    else
      cJSON_AddNullToObject(sources, key);
  }
  return sources;
}

void automation_security_sources(cJSON *sources, const cJSON *profile,
                                 const cJSON *readings) {
  if (!sources) return;
  const cJSON *sensor;
  cJSON_ArrayForEach(sensor, cJSON_GetObjectItemCaseSensitive(profile, "securitySensors")) {
    if (!enabled(sensor)) continue;
    char key[128];
    snprintf(key, sizeof(key), "security.%s.active", text(sensor, "id"));
    const cJSON *reading, *value = NULL;
    cJSON_ArrayForEach(reading, cJSON_GetObjectItemCaseSensitive(readings, "sensors")) {
      if (!strcmp(text(sensor, "id"), text(reading, "id")) && !strcmp(text(reading, "status"), "ok")) {
        value = cJSON_GetObjectItemCaseSensitive(reading, "active");
        break;
      }
    }
    if (cJSON_IsBool(value)) cJSON_AddBoolToObject(sources, key, cJSON_IsTrue(value));
    else cJSON_AddNullToObject(sources, key);
  }
}

bool automation_input_configuration_changed(const cJSON *previous, const cJSON *next) {
  if (!cJSON_IsObject(previous) || !cJSON_IsObject(next))
    return true;
  const char *sections[] = {"temperatureBuses", "temperatureZones", "hvacZones", "securitySensors"};
  for (size_t i = 0; i < sizeof(sections) / sizeof(sections[0]); ++i) {
    const cJSON *before = cJSON_GetObjectItemCaseSensitive(previous, sections[i]);
    const cJSON *after = cJSON_GetObjectItemCaseSensitive(next, sections[i]);
    if (!before && !after) continue;
    if (!cJSON_Compare(before, after, true)) return true;
  }
  return false;
}

bool automation_temperature_bus_configuration_changed(const cJSON *previous, const cJSON *next) {
  if (!cJSON_IsObject(previous) || !cJSON_IsObject(next)) return true;
  const cJSON *before = cJSON_GetObjectItemCaseSensitive(previous, "temperatureBuses");
  const cJSON *after = cJSON_GetObjectItemCaseSensitive(next, "temperatureBuses");
  return !cJSON_IsArray(before) || !cJSON_IsArray(after) || !cJSON_Compare(before, after, true);
}
