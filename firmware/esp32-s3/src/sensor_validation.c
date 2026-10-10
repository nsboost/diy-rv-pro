#include "sensor_validation.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>

static const char *text(const cJSON *item, const char *key) {
    const cJSON *value = cJSON_GetObjectItemCaseSensitive(item, key);
    return cJSON_IsString(value) ? value->valuestring : "";
}
static bool enabled(const cJSON *item) { return cJSON_IsTrue(cJSON_GetObjectItemCaseSensitive(item, "enabled")); }
static bool fail(char *error, size_t len, const char *message) { if (len) snprintf(error, len, "%s", message); return false; }
static const cJSON *find(const cJSON *array, const char *id) {
    const cJSON *item = NULL;
    cJSON_ArrayForEach(item, array) if (!strcmp(text(item, "id"), id)) return item;
    return NULL;
}
static int hex(char value) {
    value = (char)tolower((unsigned char)value);
    return value >= '0' && value <= '9' ? value - '0' : value >= 'a' && value <= 'f' ? value - 'a' + 10 : -1;
}
static bool valid_rom(const char *address) {
    if (strlen(address) != 16 || address[0] != '2' || address[1] != '8') return false;
    uint8_t bytes[8];
    for (int i = 0; i < 8; i++) {
        int hi = hex(address[i * 2]), lo = hex(address[i * 2 + 1]);
        if (hi < 0 || lo < 0) return false;
        bytes[i] = (uint8_t)((hi << 4) | lo);
    }
    uint8_t crc = 0;
    for (int i = 0; i < 7; i++) {
        uint8_t value = bytes[i];
        for (int bit = 0; bit < 8; bit++) { bool mix = (crc ^ value) & 1; crc >>= 1; if (mix) crc ^= 0x8c; value >>= 1; }
    }
    return bytes[7] == crc;
}
static bool equal_rom(const char *a, const char *b) {
    if (strlen(a) != strlen(b)) return false;
    while (*a) if (tolower((unsigned char)*a++) != tolower((unsigned char)*b++)) return false;
    return true;
}

bool sensor_inventory_validate(const cJSON *root, char *error, size_t len) {
    const cJSON *buses = cJSON_GetObjectItemCaseSensitive(root, "temperatureBuses");
    const cJSON *sensors = cJSON_GetObjectItemCaseSensitive(root, "temperatureZones");
    /* Old profiles can be loaded; editing an addressed sensor requires a bus. */
    if (buses && (!cJSON_IsArray(buses) || cJSON_GetArraySize(buses) > 4)) return fail(error, len, "Maximum four temperature buses");
    const cJSON *bus = NULL;
    cJSON_ArrayForEach(bus, buses) {
        if (!enabled(bus)) continue;
        const cJSON *pin = cJSON_GetObjectItemCaseSensitive(bus, "gpio");
        if (!cJSON_IsNumber(pin) || pin->valuedouble != pin->valueint || !((pin->valueint >= 4 && pin->valueint <= 18) || pin->valueint == 21)) return fail(error, len, "Temperature bus GPIO is reserved or unassigned");
        const cJSON *other = NULL;
        cJSON_ArrayForEach(other, buses) {
            const cJSON *other_pin = cJSON_GetObjectItemCaseSensitive(other, "gpio");
            if (other != bus && enabled(other) && cJSON_IsNumber(other_pin) && other_pin->valueint == pin->valueint) return fail(error, len, "Temperature buses cannot share a GPIO");
        }
        const char *keys[] = {"gpio", "senseGpio", "tempSensorGpio", "runSenseGpio", "rpmInputGpio", "tamperGpio"};
        const cJSON *section = NULL;
        cJSON_ArrayForEach(section, root) {
            if (!cJSON_IsArray(section) || section == buses) continue;
            const cJSON *item = NULL;
            cJSON_ArrayForEach(item, section) if (enabled(item)) {
                for (size_t i = 0; i < sizeof(keys) / sizeof(keys[0]); i++) {
                    const cJSON *used = cJSON_GetObjectItemCaseSensitive(item, keys[i]);
                    if (cJSON_IsNumber(used) && used->valueint == pin->valueint) return fail(error, len, "Temperature bus conflicts with another GPIO assignment");
                }
            }
        }
    }
    const cJSON *sensor = NULL;
    cJSON_ArrayForEach(sensor, sensors) {
        if (!enabled(sensor)) continue;
        const cJSON *low = cJSON_GetObjectItemCaseSensitive(sensor, "lowAlarmF");
        const cJSON *high = cJSON_GetObjectItemCaseSensitive(sensor, "highAlarmF");
        if (cJSON_IsNumber(low) && cJSON_IsNumber(high) && low->valuedouble >= high->valuedouble) return fail(error, len, "Temperature low alarm must be below high alarm");
        if (strcmp(text(sensor, "sensorType"), "ds18b20")) continue;
        const char *address = text(sensor, "address");
        if (!valid_rom(address)) return fail(error, len, "DS18B20 address must include a valid family and CRC");
        const cJSON *assigned_bus = find(buses, text(sensor, "busId"));
        if (!assigned_bus || !enabled(assigned_bus)) return fail(error, len, "Temperature sensor requires an enabled bus");
        const cJSON *other = NULL;
        cJSON_ArrayForEach(other, sensors) if (other != sensor && enabled(other) && equal_rom(text(other, "address"), address)) return fail(error, len, "Duplicate temperature sensor address");
    }
    const char *sections[] = {"hvacZones", "waterHeaters", "weatherStations"};
    for (size_t i = 0; i < sizeof(sections) / sizeof(sections[0]); i++) {
        const cJSON *item = NULL;
        cJSON_ArrayForEach(item, cJSON_GetObjectItemCaseSensitive(root, sections[i])) {
            if (!enabled(item)) continue;
            const char *id = text(item, "temperatureSensorId");
            if (*id) {
                const cJSON *assigned = find(sensors, id);
                if (!assigned || !enabled(assigned)) return fail(error, len, "Assigned temperature sensor is missing or disabled");
            } else if (i == 0 && !strcmp(text(item, "controlMode"), "controller")) return fail(error, len, "HVAC control requires a named temperature sensor");
        }
    }
    return true;
}
