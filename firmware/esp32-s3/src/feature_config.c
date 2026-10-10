#include "feature_config.h"
#include "sensor_validation.h"

#include <stdio.h>
#include <string.h>

#define PIN_UNUSED -1

static const char *DEFAULT_FEATURE_PROFILE =
    "{"
    "\"schemaVersion\":1,"
    "\"rvProfile\":{\"name\":\"Unconfigured RV\",\"rvType\":\"unknown\",\"lengthFt\":0,\"electricalService\":\"unknown\",\"shorePower\":\"unknown\"},"
    "\"features\":{\"hvac\":false,\"power\":false,\"solar\":false,\"generator\":false,\"water\":false,\"tanks\":false,\"temperatureMonitoring\":false,\"automation\":false,\"cameras\":false,\"security\":false},"
    "\"hvacZones\":[],"
    "\"temperatureZones\":[],"
    "\"solarChargeControllers\":[],"
    "\"inverters\":[],"
    "\"batteries\":[],"
    "\"generators\":[],"
    "\"acBreakers\":[],"
    "\"dcCircuits\":[],"
    "\"waterTanks\":[],"
    "\"waterHeaters\":[],"
    "\"waterPumps\":[],"
    "\"propaneSystems\":[],"
    "\"weatherStations\":[],"
    "\"cameras\":[],"
    "\"securityZones\":[],"
    "\"securitySensors\":[],"
    "\"customIo\":[]"
    "}";

typedef struct {
    const char *name;
    int max_count;
} array_limit_t;

static const array_limit_t ARRAY_LIMITS[] = {
    {"hvacZones", 8},
    {"temperatureBuses", 4},
    {"temperatureZones", 32},
    {"solarChargeControllers", 8},
    {"inverters", 6},
    {"batteries", 8},
    {"generators", 2},
    {"acBreakers", 48},
    {"dcCircuits", 64},
    {"waterTanks", 12},
    {"waterHeaters", 4},
    {"waterPumps", 8},
    {"propaneSystems", 4},
    {"weatherStations", 2},
    {"cameras", 8},
    {"securityZones", 16},
    {"securitySensors", 64},
    {"customIo", 64}
};

static void set_error(char *error, size_t error_len, const char *message)
{
    if (error != NULL && error_len > 0) {
        snprintf(error, error_len, "%s", message);
    }
}

static bool valid_pin(int pin)
{
    return pin == PIN_UNUSED || (pin >= 0 && pin <= 48);
}

static bool valid_relay(int relay)
{
    return relay == PIN_UNUSED || (relay >= 0 && relay <= 63);
}

static const cJSON *required_object(const cJSON *parent, const char *name, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(parent, name);
    if (!cJSON_IsObject(item)) {
        set_error(error, error_len, "Required profile object is missing");
        return NULL;
    }
    return item;
}

static const cJSON *required_array(const cJSON *parent, const char *name, int max_count, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(parent, name);
    if (!cJSON_IsArray(item)) {
        set_error(error, error_len, "Required profile array is missing");
        return NULL;
    }
    if (cJSON_GetArraySize(item) > max_count) {
        set_error(error, error_len, "Profile contains too many configured items");
        return NULL;
    }
    return item;
}

static bool optional_string_len(const cJSON *object, const char *name, size_t max_len, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    if (item == NULL) {
        return true;
    }
    if (!cJSON_IsString(item) || item->valuestring == NULL || strlen(item->valuestring) >= max_len) {
        set_error(error, error_len, "Profile string is missing or too long");
        return false;
    }
    return true;
}

static bool optional_int_range(const cJSON *object, const char *name, int min, int max, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    if (item == NULL) {
        return true;
    }
    if (!cJSON_IsNumber(item) || item->valuedouble != item->valueint || item->valueint < min || item->valueint > max) {
        set_error(error, error_len, "Profile number is out of range");
        return false;
    }
    return true;
}

static bool optional_pin(const cJSON *object, const char *name, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    if (item == NULL) {
        return true;
    }
    if (!cJSON_IsNumber(item) || item->valuedouble != item->valueint || !valid_pin(item->valueint)) {
        set_error(error, error_len, "GPIO value is out of range");
        return false;
    }
    return true;
}

static bool optional_relay(const cJSON *object, const char *name, char *error, size_t error_len)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    if (item == NULL) {
        return true;
    }
    if (!cJSON_IsNumber(item) || item->valuedouble != item->valueint || !valid_relay(item->valueint)) {
        set_error(error, error_len, "Relay channel is out of range");
        return false;
    }
    return true;
}

static bool is_enabled(const cJSON *object)
{
    const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(object, "enabled");
    return cJSON_IsTrue(enabled);
}

static bool string_equals(const cJSON *object, const char *name, const char *value)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    return cJSON_IsString(item) && strcmp(item->valuestring, value) == 0;
}

static bool has_non_disabled_type(const cJSON *object, const char *name)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    return cJSON_IsString(item) && item->valuestring != NULL && item->valuestring[0] != '\0' && strcmp(item->valuestring, "disabled") != 0;
}

static bool has_configured_pin(const cJSON *object, const char *name)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    return cJSON_IsNumber(item) && item->valueint != PIN_UNUSED && valid_pin(item->valueint);
}

static bool has_configured_relay(const cJSON *object, const char *name)
{
    const cJSON *item = cJSON_GetObjectItemCaseSensitive(object, name);
    return cJSON_IsNumber(item) && item->valueint != PIN_UNUSED && valid_relay(item->valueint);
}

static bool validate_basic_item(const cJSON *item, char *error, size_t error_len)
{
    if (!cJSON_IsObject(item)) {
        set_error(error, error_len, "Profile array item must be an object");
        return false;
    }
    static const char *boolean_fields[] = {"enabled", "monitored", "controllable", "hasAcElement", "hasDcElement", "hasPropane", "tankless", "recircPump", "requiresAuth", "recordMotion", "armHome", "armAway", "lowBattery"};
    for (size_t i = 0; i < sizeof(boolean_fields) / sizeof(boolean_fields[0]); ++i) {
        const cJSON *value = cJSON_GetObjectItemCaseSensitive(item, boolean_fields[i]);
        if (value != NULL && !cJSON_IsBool(value)) {
            set_error(error, error_len, "Inventory flags must be true or false");
            return false;
        }
    }
    return optional_string_len(item, "id", 33, error, error_len) &&
           optional_string_len(item, "label", 49, error, error_len) &&
           optional_string_len(item, "type", 33, error, error_len) &&
           optional_string_len(item, "controlMode", 33, error, error_len) &&
           optional_string_len(item, "temperatureSensorId", 33, error, error_len) &&
           optional_string_len(item, "busId", 33, error, error_len) &&
           optional_string_len(item, "address", 17, error, error_len) &&
           optional_string_len(item, "sensorType", 33, error, error_len) &&
           optional_string_len(item, "communication", 33, error, error_len) &&
           optional_string_len(item, "inputType", 33, error, error_len) &&
           optional_string_len(item, "contactPolarity", 33, error, error_len) &&
           optional_string_len(item, "zoneId", 33, error, error_len) &&
           optional_string_len(item, "role", 33, error, error_len) &&
           optional_string_len(item, "protocol", 33, error, error_len) &&
           optional_string_len(item, "gatewayName", 49, error, error_len) &&
           optional_string_len(item, "streamUrl", 257, error, error_len) &&
           optional_string_len(item, "snapshotUrl", 257, error, error_len) &&
           optional_pin(item, "gpio", error, error_len) &&
           optional_pin(item, "adcChannel", error, error_len) &&
           optional_pin(item, "senseGpio", error, error_len) &&
           optional_pin(item, "runSenseGpio", error, error_len) &&
           optional_pin(item, "rpmInputGpio", error, error_len) &&
           optional_pin(item, "tempSensorGpio", error, error_len) &&
           optional_pin(item, "tamperGpio", error, error_len) &&
           optional_relay(item, "relay", error, error_len) &&
           optional_relay(item, "startRelay", error, error_len) &&
           optional_relay(item, "stopRelay", error, error_len) &&
           optional_relay(item, "coolRelay", error, error_len) &&
           optional_relay(item, "furnaceRelay", error, error_len) &&
           optional_relay(item, "heatPumpRelay", error, error_len) &&
           optional_relay(item, "fanRelay", error, error_len) &&
           optional_relay(item, "acElementRelay", error, error_len) &&
           optional_relay(item, "dcElementRelay", error, error_len) &&
           optional_relay(item, "propaneRelay", error, error_len) &&
           optional_relay(item, "recircPumpRelay", error, error_len);
}

static bool validate_relay_device(const cJSON *item, char *error, size_t error_len)
{
    if (!validate_basic_item(item, error, error_len)) return false;
    if (is_enabled(item) && string_equals(item, "controlMode", "controller") && !has_configured_relay(item, "relay")) {
        set_error(error, error_len, "Controller-managed device requires a relay");
        return false;
    }
    return true;
}

static bool validate_hvac_zone(const cJSON *zone, char *error, size_t error_len)
{
    if (!validate_basic_item(zone, error, error_len) ||
        !optional_int_range(zone, "stageCount", 0, 4, error, error_len)) {
        return false;
    }
    if (!string_equals(zone, "controlMode", "monitor-only") &&
        !string_equals(zone, "controlMode", "self-controlled") &&
        !string_equals(zone, "controlMode", "controller")) {
        set_error(error, error_len, "HVAC control mode is required and must be supported");
        return false;
    }
    if (is_enabled(zone) && string_equals(zone, "controlMode", "controller") &&
        !has_configured_relay(zone, "coolRelay") &&
        !has_configured_relay(zone, "furnaceRelay") &&
        !has_configured_relay(zone, "heatPumpRelay") &&
        !has_configured_relay(zone, "fanRelay")) {
        set_error(error, error_len, "Enabled HVAC zone requires at least one relay output");
        return false;
    }
    return true;
}

static bool validate_generator(const cJSON *generator, char *error, size_t error_len)
{
    if (!validate_basic_item(generator, error, error_len) ||
        !optional_int_range(generator, "maxCrankSeconds", 1, 30, error, error_len) ||
        !optional_int_range(generator, "warmupSeconds", 0, 600, error, error_len) ||
        !optional_int_range(generator, "cooldownSeconds", 0, 600, error, error_len)) {
        return false;
    }
    const char *strategies[] = {"monitor-only", "two-wire", "three-wire", "momentary-start-stop", "canbus", "modbus", "dry-contact"};
    bool known_strategy = false;
    for (size_t i = 0; i < sizeof(strategies) / sizeof(strategies[0]); ++i) {
        known_strategy |= string_equals(generator, "controlStrategy", strategies[i]);
    }
    if (!known_strategy) {
        set_error(error, error_len, "Generator control strategy is required and must be supported");
        return false;
    }
    const bool relay_control = !string_equals(generator, "controlStrategy", "monitor-only") &&
                               !string_equals(generator, "controlStrategy", "canbus") &&
                               !string_equals(generator, "controlStrategy", "modbus");
    if (is_enabled(generator) && relay_control && !has_configured_relay(generator, "startRelay")) {
        set_error(error, error_len, "Enabled generator requires a start relay");
        return false;
    }
    return true;
}

static bool validate_tank(const cJSON *tank, char *error, size_t error_len)
{
    if (!validate_basic_item(tank, error, error_len) ||
        !optional_int_range(tank, "capacityGal", 0, 500, error, error_len) ||
        !optional_int_range(tank, "emptyMv", 0, 3300, error, error_len) ||
        !optional_int_range(tank, "fullMv", 0, 3300, error, error_len)) {
        return false;
    }
    if (is_enabled(tank) && !has_non_disabled_type(tank, "sensorType")) {
        set_error(error, error_len, "Enabled tank requires a sensor type");
        return false;
    }
    return true;
}

static bool validate_water_heater(const cJSON *heater, char *error, size_t error_len)
{
    if (!validate_basic_item(heater, error, error_len)) {
        return false;
    }
    const cJSON *control_mode = cJSON_GetObjectItemCaseSensitive(heater, "controlMode");
    const bool controller_managed = cJSON_IsString(control_mode) && strcmp(control_mode->valuestring, "controller") == 0;
    if (is_enabled(heater) && controller_managed &&
        !has_configured_relay(heater, "acElementRelay") &&
        !has_configured_relay(heater, "dcElementRelay") &&
        !has_configured_relay(heater, "propaneRelay")) {
        set_error(error, error_len, "Controller-managed water heater requires a heating output");
        return false;
    }
    return true;
}

static bool validate_breaker(const cJSON *breaker, char *error, size_t error_len)
{
    if (!validate_basic_item(breaker, error, error_len) ||
        !optional_int_range(breaker, "ratingA", 0, 100, error, error_len)) {
        return false;
    }
    const cJSON *controllable = cJSON_GetObjectItemCaseSensitive(breaker, "controllable");
    if (is_enabled(breaker) && cJSON_IsTrue(controllable) && !has_configured_relay(breaker, "relay")) {
        set_error(error, error_len, "Controllable breaker requires a relay");
        return false;
    }
    return true;
}

static bool validate_power_device(const cJSON *device, char *error, size_t error_len)
{
    if (!validate_relay_device(device, error, error_len) ||
        !optional_int_range(device, "maxCurrentA", 0, 500, error, error_len) ||
        !optional_int_range(device, "capacityAh", 0, 2000, error, error_len)) {
        return false;
    }
    if (is_enabled(device) &&
        !has_non_disabled_type(device, "communication") &&
        !has_non_disabled_type(device, "sensorType") &&
        !has_configured_pin(device, "senseGpio") &&
        !has_configured_pin(device, "adcChannel")) {
        set_error(error, error_len, "Enabled power device requires communications or a sensor input");
        return false;
    }
    return true;
}

static bool validate_temperature_zone(const cJSON *zone, char *error, size_t error_len)
{
    if (!validate_basic_item(zone, error, error_len) ||
        !optional_int_range(zone, "lowAlarmF", -40, 250, error, error_len) ||
        !optional_int_range(zone, "highAlarmF", -40, 250, error, error_len)) {
        return false;
    }
    if (is_enabled(zone) && !has_non_disabled_type(zone, "sensorType") && !has_configured_pin(zone, "tempSensorGpio")) {
        set_error(error, error_len, "Enabled temperature zone requires a temperature sensor");
        return false;
    }
    return true;
}

static bool validate_camera(const cJSON *camera, char *error, size_t error_len)
{
    if (!validate_basic_item(camera, error, error_len)) {
        return false;
    }
    if (is_enabled(camera) &&
        !has_non_disabled_type(camera, "streamUrl") &&
        !has_non_disabled_type(camera, "snapshotUrl")) {
        set_error(error, error_len, "Enabled camera requires a stream or snapshot URL");
        return false;
    }
    return true;
}

static bool validate_security_zone(const cJSON *zone, char *error, size_t error_len)
{
    return validate_basic_item(zone, error, error_len) &&
           optional_int_range(zone, "entryDelaySeconds", 0, 600, error, error_len) &&
           optional_int_range(zone, "exitDelaySeconds", 0, 600, error, error_len);
}

static bool validate_security_sensor(const cJSON *sensor, char *error, size_t error_len)
{
    if (!validate_basic_item(sensor, error, error_len) ||
        !optional_int_range(sensor, "expanderAddress", -1, 127, error, error_len) ||
        !optional_int_range(sensor, "expanderPin", -1, 31, error, error_len) ||
        !optional_int_range(sensor, "heartbeatSeconds", 0, 86400, error, error_len)) {
        return false;
    }
    if (is_enabled(sensor) &&
        !has_configured_pin(sensor, "gpio") &&
        !has_configured_pin(sensor, "senseGpio") &&
        !has_non_disabled_type(sensor, "inputType")) {
        set_error(error, error_len, "Enabled security sensor requires an input strategy");
        return false;
    }
    return true;
}

static bool validate_array_items(const cJSON *root, const char *name, bool (*validator)(const cJSON *, char *, size_t), char *error, size_t error_len)
{
    const cJSON *array = cJSON_GetObjectItemCaseSensitive(root, name);
    if (!cJSON_IsArray(array)) {
        set_error(error, error_len, "Required profile array is missing");
        return false;
    }
    cJSON *item = NULL;
    cJSON_ArrayForEach(item, array) {
        if (!validator(item, error, error_len)) {
            return false;
        }
    }
    return true;
}

static bool validate_profile_json(const cJSON *root, char *error, size_t error_len)
{
    if (!cJSON_IsObject(root)) {
        set_error(error, error_len, "Features must be a JSON object");
        return false;
    }

    const cJSON *schema = cJSON_GetObjectItemCaseSensitive(root, "schemaVersion");
    if (!cJSON_IsNumber(schema) || schema->valuedouble != DIY_CONFIG_SCHEMA_VERSION) {
        set_error(error, error_len, "Unsupported feature profile schema version");
        return false;
    }

    if (required_object(root, "rvProfile", error, error_len) == NULL ||
        required_object(root, "features", error, error_len) == NULL) {
        return false;
    }

    for (size_t i = 0; i < sizeof(ARRAY_LIMITS) / sizeof(ARRAY_LIMITS[0]); ++i) {
        if (!strcmp(ARRAY_LIMITS[i].name, "temperatureBuses") && !cJSON_GetObjectItemCaseSensitive(root, "temperatureBuses")) continue;
        if (required_array(root, ARRAY_LIMITS[i].name, ARRAY_LIMITS[i].max_count, error, error_len) == NULL) {
            return false;
        }
    }

    /* IDs are cross-device references, including disabled items retained for later. */
    for (size_t i = 0; i < sizeof(ARRAY_LIMITS) / sizeof(ARRAY_LIMITS[0]); ++i) {
        const cJSON *array = cJSON_GetObjectItemCaseSensitive(root, ARRAY_LIMITS[i].name);
        const cJSON *item = NULL;
        cJSON_ArrayForEach(item, array) {
            const cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
            if (!cJSON_IsString(id) || id->valuestring[0] == '\0' || strlen(id->valuestring) > 32) {
                set_error(error, error_len, "Every configured item requires an ID of 1 to 32 characters");
                return false;
            }
            const char *identity = id->valuestring;
            const char *letters_digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            if (strchr(letters_digits, identity[0]) == NULL ||
                strspn(identity, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-") != strlen(identity) ||
                strcmp(identity, "constructor") == 0 || strcmp(identity, "prototype") == 0) {
                set_error(error, error_len, "Item ID must use letters, digits, hyphens or underscores, beginning with a letter or digit");
                return false;
            }
            for (size_t j = 0; j <= i; ++j) {
                const cJSON *previous = NULL;
                cJSON_ArrayForEach(previous, cJSON_GetObjectItemCaseSensitive(root, ARRAY_LIMITS[j].name)) {
                    if (previous == item) break;
                    const cJSON *previous_id = cJSON_GetObjectItemCaseSensitive(previous, "id");
                    if (cJSON_IsString(previous_id) && strcmp(id->valuestring, previous_id->valuestring) == 0) {
                        set_error(error, error_len, "Configured item IDs must be unique across the profile");
                        return false;
                    }
                }
            }
        }
    }

    if (!sensor_inventory_validate(root, error, error_len)) return false;
    return validate_array_items(root, "hvacZones", validate_hvac_zone, error, error_len) &&
           validate_array_items(root, "temperatureZones", validate_temperature_zone, error, error_len) &&
           validate_array_items(root, "solarChargeControllers", validate_power_device, error, error_len) &&
           validate_array_items(root, "inverters", validate_power_device, error, error_len) &&
           validate_array_items(root, "batteries", validate_power_device, error, error_len) &&
           validate_array_items(root, "generators", validate_generator, error, error_len) &&
           validate_array_items(root, "acBreakers", validate_breaker, error, error_len) &&
           validate_array_items(root, "dcCircuits", validate_breaker, error, error_len) &&
           validate_array_items(root, "waterTanks", validate_tank, error, error_len) &&
           validate_array_items(root, "waterHeaters", validate_water_heater, error, error_len) &&
           validate_array_items(root, "waterPumps", validate_relay_device, error, error_len) &&
           validate_array_items(root, "propaneSystems", validate_basic_item, error, error_len) &&
           validate_array_items(root, "weatherStations", validate_basic_item, error, error_len) &&
           validate_array_items(root, "cameras", validate_camera, error, error_len) &&
           validate_array_items(root, "securityZones", validate_security_zone, error, error_len) &&
           validate_array_items(root, "securitySensors", validate_security_sensor, error, error_len) &&
           validate_array_items(root, "customIo", validate_relay_device, error, error_len);
}

void feature_config_defaults(diy_feature_config_t *features)
{
    memset(features, 0, sizeof(*features));
    features->schema_version = DIY_CONFIG_SCHEMA_VERSION;
    snprintf(features->profile_json, sizeof(features->profile_json), "%s", DEFAULT_FEATURE_PROFILE);
}

cJSON *feature_config_to_json(const diy_feature_config_t *features)
{
    cJSON *json = cJSON_Parse(features->profile_json);
    if (json != NULL) {
        return json;
    }
    return cJSON_Parse(DEFAULT_FEATURE_PROFILE);
}

esp_err_t feature_config_update_from_json(diy_feature_config_t *features, const cJSON *json, char *error, size_t error_len)
{
    if (!validate_profile_json(json, error, error_len)) {
        return ESP_ERR_INVALID_ARG;
    }

    char *serialized = cJSON_PrintUnformatted(json);
    if (serialized == NULL) {
        set_error(error, error_len, "Feature profile could not be serialized");
        return ESP_ERR_NO_MEM;
    }

    if (strlen(serialized) >= sizeof(features->profile_json)) {
        cJSON_free(serialized);
        set_error(error, error_len, "Feature profile is too large");
        return ESP_ERR_INVALID_SIZE;
    }

    features->schema_version = DIY_CONFIG_SCHEMA_VERSION;
    snprintf(features->profile_json, sizeof(features->profile_json), "%s", serialized);
    cJSON_free(serialized);
    return ESP_OK;
}
