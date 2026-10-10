#include "mock_telemetry.h"

#include <stdio.h>
#include <string.h>

void mock_telemetry_init(mock_telemetry_t *state)
{
    state->generator_running = false;
    state->automation_quiet_hours = false;
    state->zone_1_setpoint = 72;
    state->zone_2_setpoint = 70;
    state->sequence = 0;
}

void mock_telemetry_tick(mock_telemetry_t *state)
{
    state->sequence += 1;
}

static void add_number(cJSON *object, const char *name, double value)
{
    cJSON_AddNumberToObject(object, name, value);
}

static cJSON *make_hvac_zone(const char *id, const char *name, int temp, int setpoint, bool heat_pump)
{
    cJSON *zone = cJSON_CreateObject();
    cJSON_AddStringToObject(zone, "id", id);
    cJSON_AddStringToObject(zone, "name", name);
    add_number(zone, "tempF", temp);
    add_number(zone, "setpointF", setpoint);
    cJSON_AddStringToObject(zone, "mode", "Cool");
    cJSON_AddBoolToObject(zone, "ac", !heat_pump);
    cJSON_AddBoolToObject(zone, "furnace", false);
    cJSON_AddBoolToObject(zone, "heatPump", heat_pump);
    cJSON_AddBoolToObject(zone, "fan", false);
    cJSON_AddBoolToObject(zone, "auto", false);
    return zone;
}

static cJSON *make_tank(const char *id, const char *label, int level, double used, int capacity, const char *color)
{
    cJSON *tank = cJSON_CreateObject();
    cJSON_AddStringToObject(tank, "id", id);
    cJSON_AddStringToObject(tank, "label", label);
    add_number(tank, "level", level);
    add_number(tank, "used", used);
    add_number(tank, "capacity", capacity);
    cJSON_AddStringToObject(tank, "unit", "GAL");
    cJSON_AddStringToObject(tank, "color", color);
    return tank;
}

static cJSON *make_event(int id, const char *time, const char *type, const char *message)
{
    cJSON *event = cJSON_CreateObject();
    add_number(event, "id", id);
    cJSON_AddStringToObject(event, "time", time);
    cJSON_AddStringToObject(event, "type", type);
    cJSON_AddStringToObject(event, "message", message);
    return event;
}

static cJSON *make_history(const char *time, double battery, int solar, int loads)
{
    cJSON *point = cJSON_CreateObject();
    cJSON_AddStringToObject(point, "time", time);
    add_number(point, "battery", battery);
    add_number(point, "solar", solar);
    add_number(point, "loads", loads);
    return point;
}

cJSON *mock_telemetry_to_json(const mock_telemetry_t *state)
{
    const int solar_watts = 482 + (state->sequence % 6) * 7;
    const int loads_watts = 823 + (state->sequence % 4) * 11;
    cJSON *root = cJSON_CreateObject();

    cJSON *controller = cJSON_AddObjectToObject(root, "controller");
    cJSON_AddStringToObject(controller, "name", "DIY RV PRO");
    cJSON_AddBoolToObject(controller, "online", true);
    cJSON_AddStringToObject(controller, "firmware", "v1.2.7");
    cJSON_AddStringToObject(controller, "uptime", "5d 14h 22m");
    cJSON_AddStringToObject(controller, "localIp", "192.168.4.1");
    add_number(controller, "alerts", 3);

    cJSON *wifi = cJSON_AddObjectToObject(root, "wifi");
    cJSON_AddStringToObject(wifi, "mode", "AP + Station");
    cJSON_AddStringToObject(wifi, "ssid", "Campground-5G");
    cJSON_AddStringToObject(wifi, "strength", "Strong");
    add_number(wifi, "rssi", -48);

    cJSON *time = cJSON_AddObjectToObject(root, "time");
    cJSON_AddStringToObject(time, "display", "7:32:15 PM");
    cJSON_AddStringToObject(time, "date", "May 24, 2025");

    cJSON *battery = cJSON_AddObjectToObject(root, "battery");
    add_number(battery, "voltage", 13.34);
    add_number(battery, "current", -2.1);
    add_number(battery, "stateOfCharge", 26);
    add_number(battery, "temperatureF", 78.4);
    cJSON_AddStringToObject(battery, "status", "Discharging");

    cJSON *solar = cJSON_AddObjectToObject(root, "solar");
    add_number(solar, "watts", solar_watts);
    add_number(solar, "voltage", 31.5);
    add_number(solar, "current", 15.3);
    add_number(solar, "todayKwh", 2.45);

    cJSON *loads = cJSON_AddObjectToObject(root, "loads");
    add_number(loads, "watts", loads_watts);
    add_number(loads, "voltage", 120);
    add_number(loads, "current", 6.9);
    add_number(loads, "totalKwh", 2.1);

    cJSON *shore = cJSON_AddObjectToObject(root, "shorePower");
    cJSON_AddBoolToObject(shore, "connected", true);
    add_number(shore, "voltage", 120);
    add_number(shore, "current", 30);
    cJSON_AddStringToObject(shore, "quality", "Good");

    cJSON *inverter = cJSON_AddObjectToObject(root, "inverter");
    cJSON_AddStringToObject(inverter, "mode", "AC Pass Through");
    add_number(inverter, "voltage", 120);
    add_number(inverter, "frequencyHz", 60);
    add_number(inverter, "efficiency", 93);

    cJSON *weather = cJSON_AddObjectToObject(root, "weather");
    add_number(weather, "temperatureF", 72);
    cJSON_AddStringToObject(weather, "summary", "Partly Cloudy");
    add_number(weather, "highF", 81);
    add_number(weather, "lowF", 61);
    add_number(weather, "humidity", 52);
    add_number(weather, "windMph", 6);

    cJSON *generator = cJSON_AddObjectToObject(root, "generator");
    cJSON_AddBoolToObject(generator, "running", state->generator_running);
    add_number(generator, "runHours", state->generator_running ? 0.1 : 0);
    cJSON_AddStringToObject(generator, "fuelType", "Diesel");
    cJSON_AddStringToObject(generator, "startMethod", "2-Wire");
    cJSON_AddBoolToObject(generator, "autoStart", true);
    cJSON_AddStringToObject(generator, "nextStart", "--:--");

    cJSON *zones = cJSON_AddArrayToObject(root, "hvacZones");
    cJSON_AddItemToArray(zones, make_hvac_zone("zone-1", "HVAC - Zone 1", 72, state->zone_1_setpoint, false));
    cJSON_AddItemToArray(zones, make_hvac_zone("zone-2", "HVAC - Zone 2", 70, state->zone_2_setpoint, true));

    cJSON *tanks = cJSON_AddArrayToObject(root, "tanks");
    cJSON_AddItemToArray(tanks, make_tank("fresh", "Fresh", 68, 54, 80, "blue"));
    cJSON_AddItemToArray(tanks, make_tank("gray", "Gray", 42, 21, 50, "gray"));
    cJSON_AddItemToArray(tanks, make_tank("black", "Black", 28, 14, 50, "black"));
    cJSON_AddItemToArray(tanks, make_tank("lp", "LP Tank", 76, 14.2, 20, "gold"));

    cJSON *rules = cJSON_AddArrayToObject(root, "automationRules");
    cJSON *quiet = cJSON_CreateObject();
    cJSON_AddStringToObject(quiet, "id", "quiet-hours");
    cJSON_AddStringToObject(quiet, "name", "Quiet Hours");
    cJSON_AddStringToObject(quiet, "detail", "10:00 PM - 7:00 AM");
    cJSON_AddBoolToObject(quiet, "enabled", state->automation_quiet_hours);
    cJSON_AddItemToArray(rules, quiet);

    cJSON *events = cJSON_AddArrayToObject(root, "events");
    cJSON_AddItemToArray(events, make_event(1, "7:31 PM", "success", "Shore power connected"));
    cJSON_AddItemToArray(events, make_event(2, "7:30 PM", "success", "Battery voltage normal"));
    cJSON_AddItemToArray(events, make_event(3, "7:28 PM", "warning", "Gray tank level high"));
    cJSON_AddItemToArray(events, make_event(4, "7:22 PM", "success", "Automation rule executed: Start AC1 (Zone 1)"));

    cJSON *history = cJSON_AddArrayToObject(root, "powerHistory");
    cJSON_AddItemToArray(history, make_history("12 PM", 13.3, 0, 430));
    cJSON_AddItemToArray(history, make_history("3 PM", 13.52, 920, 470));
    cJSON_AddItemToArray(history, make_history("6 PM", 13.46, 560, 430));
    cJSON_AddItemToArray(history, make_history("9 PM", 13.3, 0, 420));
    cJSON_AddItemToArray(history, make_history("12 AM", 13.05, 0, 455));
    cJSON_AddItemToArray(history, make_history("6 AM", 12.42, 0, 380));
    cJSON_AddItemToArray(history, make_history("10 AM", 13.12, 0, 470));

    return root;
}

bool mock_telemetry_apply_control(mock_telemetry_t *state, const cJSON *command, char *error, int error_len)
{
    const cJSON *type = cJSON_GetObjectItemCaseSensitive(command, "type");
    if (!cJSON_IsString(type)) {
        snprintf(error, error_len, "Missing control action type");
        return false;
    }

    if (strcmp(type->valuestring, "generator.start") == 0) {
        state->generator_running = true;
        return true;
    }

    if (strcmp(type->valuestring, "generator.stop") == 0) {
        state->generator_running = false;
        return true;
    }

    if (strcmp(type->valuestring, "automation.setEnabled") == 0) {
        const cJSON *id = cJSON_GetObjectItemCaseSensitive(command, "id");
        const cJSON *enabled = cJSON_GetObjectItemCaseSensitive(command, "enabled");
        if (!cJSON_IsString(id) || strcmp(id->valuestring, "quiet-hours") != 0 || !cJSON_IsBool(enabled)) {
            snprintf(error, error_len, "Unsupported automation rule");
            return false;
        }
        state->automation_quiet_hours = cJSON_IsTrue(enabled);
        return true;
    }

    if (strcmp(type->valuestring, "hvac.setTarget") == 0) {
        const cJSON *zone_id = cJSON_GetObjectItemCaseSensitive(command, "zoneId");
        const cJSON *setpoint = cJSON_GetObjectItemCaseSensitive(command, "setpointF");
        if (!cJSON_IsString(zone_id) || !cJSON_IsNumber(setpoint) || setpoint->valueint < 45 || setpoint->valueint > 95) {
            snprintf(error, error_len, "Invalid HVAC setpoint");
            return false;
        }
        if (strcmp(zone_id->valuestring, "zone-1") == 0) {
            state->zone_1_setpoint = setpoint->valueint;
            return true;
        }
        if (strcmp(zone_id->valuestring, "zone-2") == 0) {
            state->zone_2_setpoint = setpoint->valueint;
            return true;
        }
    }

    snprintf(error, error_len, "Unsupported simulated control action");
    return false;
}
