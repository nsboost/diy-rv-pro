#include "automation_engine.h"
#include <string.h>

#include "feature_config.h"
#include "contact_filter.h"
#include "mock_telemetry.h"
#include "unity.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_generator_start_stop_actions_are_simulated(void)
{
    mock_telemetry_t state;
    mock_telemetry_init(&state);

    cJSON *start = cJSON_CreateObject();
    cJSON_AddStringToObject(start, "type", "generator.start");
    char error[96] = {0};

    TEST_ASSERT_TRUE(mock_telemetry_apply_control(&state, start, error, sizeof(error)));
    TEST_ASSERT_TRUE(state.generator_running);
    cJSON_Delete(start);

    cJSON *stop = cJSON_CreateObject();
    cJSON_AddStringToObject(stop, "type", "generator.stop");

    TEST_ASSERT_TRUE(mock_telemetry_apply_control(&state, stop, error, sizeof(error)));
    TEST_ASSERT_FALSE(state.generator_running);
    cJSON_Delete(stop);
}

void test_hvac_setpoint_rejects_unsafe_range(void)
{
    mock_telemetry_t state;
    mock_telemetry_init(&state);

    cJSON *command = cJSON_CreateObject();
    cJSON_AddStringToObject(command, "type", "hvac.setTarget");
    cJSON_AddStringToObject(command, "zoneId", "zone-1");
    cJSON_AddNumberToObject(command, "setpointF", 120);
    char error[96] = {0};

    TEST_ASSERT_FALSE(mock_telemetry_apply_control(&state, command, error, sizeof(error)));
    TEST_ASSERT_NOT_EQUAL(0, strlen(error));
    TEST_ASSERT_EQUAL(72, state.zone_1_setpoint);
    cJSON_Delete(command);
}

void test_feature_config_accepts_tank_setup(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);

    cJSON *root = feature_config_to_json(&features);
    cJSON *tanks = cJSON_GetObjectItemCaseSensitive(root, "waterTanks");
    cJSON *fresh = cJSON_CreateObject();
    cJSON_AddBoolToObject(fresh, "enabled", true);
    cJSON_AddStringToObject(fresh, "id", "fresh");
    cJSON_AddStringToObject(fresh, "label", "Fresh");
    cJSON_AddStringToObject(fresh, "sensorType", "resistive-0-180-ohm");
    cJSON_AddNumberToObject(fresh, "adcChannel", 3);
    cJSON_AddNumberToObject(fresh, "capacityGal", 80);
    cJSON_AddItemToArray(tanks, fresh);

    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    TEST_ASSERT_TRUE(strstr(features.profile_json, "\"waterTanks\"") != NULL);
    TEST_ASSERT_TRUE(strstr(features.profile_json, "\"fresh\"") != NULL);
    cJSON_Delete(root);
}

void test_feature_config_rejects_enabled_generator_without_start_relay(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);

    cJSON *root = feature_config_to_json(&features);
    cJSON *generators = cJSON_GetObjectItemCaseSensitive(root, "generators");
    cJSON *generator = cJSON_CreateObject();
    cJSON_AddBoolToObject(generator, "enabled", true);
    cJSON_AddStringToObject(generator, "id", "generator-1");
    cJSON_AddStringToObject(generator, "label", "Generator");
    cJSON_AddStringToObject(generator, "controlStrategy", "two-wire");
    cJSON_AddItemToArray(generators, generator);

    char error[128] = {0};
    TEST_ASSERT_NOT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    TEST_ASSERT_NOT_EQUAL(0, strlen(error));
    cJSON_Delete(root);
}

void test_monitoring_modes_do_not_require_output_relays(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);
    cJSON *root = feature_config_to_json(&features);
    cJSON *zone = cJSON_CreateObject();
    cJSON_AddStringToObject(zone, "id", "zone-1");
    cJSON_AddBoolToObject(zone, "enabled", true);
    cJSON_AddStringToObject(zone, "controlMode", "monitor-only");
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "hvacZones"), zone);
    cJSON *generator = cJSON_CreateObject();
    cJSON_AddStringToObject(generator, "id", "generator-1");
    cJSON_AddBoolToObject(generator, "enabled", true);
    cJSON_AddStringToObject(generator, "controlStrategy", "monitor-only");
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "generators"), generator);
    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(zone, "controlMode", cJSON_CreateString("self-controlled"));
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(zone, "controlMode", cJSON_CreateString("controller"));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_Delete(root);
}

void test_fractional_gpio_is_rejected_without_mutating_saved_profile(void)
{
    static diy_feature_config_t features;
    static diy_feature_config_t original;
    feature_config_defaults(&features);
    original = features;
    cJSON *root = feature_config_to_json(&features);
    cJSON *sensor = cJSON_CreateObject();
    cJSON_AddStringToObject(sensor, "id", "sensor-1");
    cJSON_AddNumberToObject(sensor, "gpio", 4.5);
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "customIo"), sensor);
    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    TEST_ASSERT_EQUAL_STRING(original.profile_json, features.profile_json);
    cJSON_Delete(root);
}

void test_invalid_modes_and_fractional_schema_are_rejected(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);
    cJSON *root = feature_config_to_json(&features);
    cJSON *generator = cJSON_CreateObject();
    cJSON_AddStringToObject(generator, "id", "generator-1");
    cJSON_AddBoolToObject(generator, "enabled", true);
    cJSON_AddNumberToObject(generator, "startRelay", 1);
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "generators"), generator);
    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_AddStringToObject(generator, "controlStrategy", "unknown-mode");
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(generator, "controlStrategy", cJSON_CreateString("two-wire"));
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(generator, "startRelay", cJSON_CreateNumber(1.5));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(generator, "startRelay", cJSON_CreateNumber(1));
    cJSON_ReplaceItemInObjectCaseSensitive(root, "schemaVersion", cJSON_CreateNumber(1.5));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_Delete(root);
}

void test_duplicate_and_missing_device_ids_are_rejected(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);
    cJSON *root = feature_config_to_json(&features);
    cJSON *first = cJSON_CreateObject();
    cJSON *second = cJSON_CreateObject();
    cJSON_AddStringToObject(first, "id", "shared-id");
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "waterPumps"), first);
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "customIo"), second);
    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_AddStringToObject(second, "id", "shared-id");
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(second, "id", cJSON_CreateString("distinct-id"));
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "customIo"), cJSON_Duplicate(second, true));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_Delete(root);
}

void test_contact_filter_requires_stable_samples(void)
{
    contact_filter_t filter = {0};
    contact_filter_sample(&filter, false, 0, 50);
    TEST_ASSERT_FALSE(filter.valid);
    contact_filter_sample(&filter, false, 49, 50);
    TEST_ASSERT_FALSE(filter.valid);
    contact_filter_sample(&filter, false, 50, 50);
    TEST_ASSERT_TRUE(filter.valid);
    TEST_ASSERT_FALSE(filter.value);
    contact_filter_sample(&filter, true, 60, 50);
    contact_filter_sample(&filter, false, 80, 50);
    contact_filter_sample(&filter, true, 90, 50);
    contact_filter_sample(&filter, true, 139, 50);
    TEST_ASSERT_FALSE(filter.value);
    contact_filter_sample(&filter, true, 140, 50);
    TEST_ASSERT_TRUE(filter.value);
}

void test_addressed_temperature_inventory(void)
{
    static diy_feature_config_t features;
    feature_config_defaults(&features);
    cJSON *root = feature_config_to_json(&features);
    cJSON *buses = cJSON_AddArrayToObject(root, "temperatureBuses");
    cJSON *bus = cJSON_Parse("{\"id\":\"bus-1\",\"label\":\"Cabin\",\"enabled\":true,\"gpio\":4}");
    cJSON_AddItemToArray(buses, bus);
    cJSON *sensor = cJSON_Parse("{\"id\":\"bedroom\",\"label\":\"Bedroom\",\"enabled\":true,\"sensorType\":\"ds18b20\",\"busId\":\"bus-1\",\"address\":\"2801000000000029\",\"lowAlarmF\":40,\"highAlarmF\":95}");
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "temperatureZones"), sensor);
    cJSON *zone = cJSON_Parse("{\"id\":\"zone-1\",\"label\":\"Bedroom HVAC\",\"enabled\":true,\"controlMode\":\"controller\",\"coolRelay\":0,\"temperatureSensorId\":\"bedroom\"}");
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "hvacZones"), zone);
    char error[128] = {0};
    TEST_ASSERT_EQUAL(ESP_OK, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(sensor, "address", cJSON_CreateString("2801000000000000"));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(sensor, "address", cJSON_CreateString("2801000000000029"));
    cJSON_ReplaceItemInObjectCaseSensitive(zone, "temperatureSensorId", cJSON_CreateString("missing"));
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(zone, "temperatureSensorId", cJSON_CreateString("bedroom"));
    cJSON *duplicate = cJSON_Duplicate(sensor, true);
    cJSON_ReplaceItemInObjectCaseSensitive(duplicate, "id", cJSON_CreateString("second-probe"));
    cJSON_AddItemToArray(cJSON_GetObjectItemCaseSensitive(root, "temperatureZones"), duplicate);
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_ARG, feature_config_update_from_json(&features, root, error, sizeof(error)));
    cJSON_Delete(root);
}


static int executions;
static bool allow_execution;
static bool last_restoring;
static bool execute_test_rule(const cJSON *rule,const cJSON *action,bool restoring,void *context) {
    (void)rule; (void)action; (void)context;
    executions++; last_restoring=restoring; return allow_execution;
}
static cJSON *temperature_rules(void) {
    return cJSON_Parse("[{\"id\":\"temp-alert\",\"name\":\"Bedroom warm\",\"enabled\":true,\"trigger\":{\"source\":\"temperature.bedroom.tempF\",\"operator\":\">\",\"value\":\"75\",\"holdFor\":\"5 sec\"},\"action\":{\"target\":\"notification\",\"command\":\"sendAlert\",\"value\":\"Bedroom warm\"},\"reverse\":{\"enabled\":true,\"source\":\"temperature.bedroom.tempF\",\"operator\":\"<\",\"value\":\"72\",\"target\":\"notification\",\"command\":\"sendAlert\",\"restoreValue\":\"Recovered\"}}]");
}
static void test_automation_hold_fault_reset_restore_and_retry(void) {
    automation_engine_t engine={0}; char error[96];
    cJSON *rules=temperature_rules(), *sources=cJSON_CreateObject();
    TEST_ASSERT_TRUE(automation_validate_rules(rules,error,sizeof(error)));
    executions=0; allow_execution=true;
    cJSON_AddNumberToObject(sources,"temperature.bedroom.tempF",80);
    automation_engine_tick(&engine,rules,sources,1000,execute_test_rule,NULL);
    cJSON_ReplaceItemInObjectCaseSensitive(sources,"temperature.bedroom.tempF",cJSON_CreateNull());
    automation_engine_tick(&engine,rules,sources,6000,execute_test_rule,NULL);
    TEST_ASSERT_EQUAL(0,executions);
    cJSON_ReplaceItemInObjectCaseSensitive(sources,"temperature.bedroom.tempF",cJSON_CreateNumber(80));
    automation_engine_tick(&engine,rules,sources,7000,execute_test_rule,NULL);
    automation_engine_tick(&engine,rules,sources,12000,execute_test_rule,NULL);
    TEST_ASSERT_EQUAL(1,executions); TEST_ASSERT_FALSE(last_restoring);
    automation_engine_tick(&engine,rules,sources,13000,execute_test_rule,NULL); TEST_ASSERT_EQUAL(1,executions);
    cJSON_ReplaceItemInObjectCaseSensitive(sources,"temperature.bedroom.tempF",cJSON_CreateNumber(70));
    allow_execution=false;
    automation_engine_tick(&engine,rules,sources,14000,execute_test_rule,NULL);
    TEST_ASSERT_TRUE(engine.rules[0].active); TEST_ASSERT_EQUAL(2,executions);
    allow_execution=true;
    automation_engine_tick(&engine,rules,sources,15000,execute_test_rule,NULL); TEST_ASSERT_EQUAL(2,executions);
    automation_engine_tick(&engine,rules,sources,44000,execute_test_rule,NULL);
    TEST_ASSERT_EQUAL(3,executions); TEST_ASSERT_TRUE(last_restoring); TEST_ASSERT_FALSE(engine.rules[0].active);
    automation_engine_reset(&engine); cJSON_Delete(rules); cJSON_Delete(sources);
}
static void test_automation_clock_comparisons(void) {
    char error[96]; cJSON *rules=temperature_rules();
    cJSON *rule=cJSON_GetArrayItem(rules,0), *trigger=cJSON_GetObjectItemCaseSensitive(rule,"trigger");
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"source",cJSON_CreateString("time.local"));
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"value",cJSON_CreateString("06:30"));
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"holdFor",cJSON_CreateString("0 sec"));
    cJSON_ReplaceItemInObjectCaseSensitive(cJSON_GetObjectItemCaseSensitive(rule,"reverse"),"enabled",cJSON_CreateBool(false));
    const char *operators[]={"=","!=",">",">=","<","<="};
    const int minutes[]={390,391,391,390,389,390};
    for (int i=0;i<6;i++) {
        automation_engine_t engine={0}; cJSON *sources=cJSON_CreateObject();
        cJSON_ReplaceItemInObjectCaseSensitive(trigger,"operator",cJSON_CreateString(operators[i]));
        TEST_ASSERT_TRUE(automation_validate_rules(rules,error,sizeof(error)));
        cJSON_AddNumberToObject(sources,"time.local",minutes[i]);
        executions=0; allow_execution=true;
        automation_engine_tick(&engine,rules,sources,1000,execute_test_rule,NULL);
        TEST_ASSERT_EQUAL(1,executions);
        automation_engine_reset(&engine); cJSON_Delete(sources);
    }
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"value",cJSON_CreateString("25:00"));
    TEST_ASSERT_FALSE(automation_validate_rules(rules,error,sizeof(error)));
    cJSON_Delete(rules);
}
static void test_automation_rejects_invalid_rules(void) {
    char error[96]; cJSON *rules=temperature_rules();
    cJSON *rule=cJSON_GetArrayItem(rules,0), *trigger=cJSON_GetObjectItemCaseSensitive(rule,"trigger");
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"holdFor",cJSON_CreateString("25 hours"));
    TEST_ASSERT_FALSE(automation_validate_rules(rules,error,sizeof(error)));
    cJSON_ReplaceItemInObjectCaseSensitive(trigger,"holdFor",cJSON_CreateString("0 sec"));
    cJSON_ReplaceItemInObjectCaseSensitive(cJSON_GetObjectItemCaseSensitive(rule,"action"),"command",cJSON_CreateString("sendEmail"));
    TEST_ASSERT_FALSE(automation_validate_rules(rules,error,sizeof(error))); cJSON_Delete(rules);
}

#ifdef DIY_HOST_TEST
int main(void)
#else
void app_main(void)
#endif
{
    UNITY_BEGIN();
    RUN_TEST(test_automation_hold_fault_reset_restore_and_retry);
    RUN_TEST(test_automation_rejects_invalid_rules);
    RUN_TEST(test_automation_clock_comparisons);
    RUN_TEST(test_addressed_temperature_inventory);
    RUN_TEST(test_contact_filter_requires_stable_samples);
    RUN_TEST(test_duplicate_and_missing_device_ids_are_rejected);
    RUN_TEST(test_invalid_modes_and_fractional_schema_are_rejected);
    RUN_TEST(test_monitoring_modes_do_not_require_output_relays);
    RUN_TEST(test_fractional_gpio_is_rejected_without_mutating_saved_profile);
    RUN_TEST(test_generator_start_stop_actions_are_simulated);
    RUN_TEST(test_hvac_setpoint_rejects_unsafe_range);
    RUN_TEST(test_feature_config_accepts_tank_setup);
    RUN_TEST(test_feature_config_rejects_enabled_generator_without_start_relay);
#ifdef DIY_HOST_TEST
    return UNITY_END();
#else
    UNITY_END();
#endif
}
