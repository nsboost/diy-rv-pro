#include "temperature_inputs.h"
#include "ds18b20.h"
#include "onewire_bus.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

#define BUS_LIMIT 4
#define SENSOR_LIMIT 32
typedef struct { char id[33]; int gpio; onewire_bus_handle_t handle; } temperature_bus_t;
typedef struct { char bus_id[33]; char address[17]; ds18b20_device_handle_t handle; float celsius; bool valid; int64_t sampled_ms; } temperature_probe_t;
static temperature_bus_t buses[BUS_LIMIT];
static temperature_probe_t probes[SENSOR_LIMIT];
static size_t bus_count, probe_count;
static SemaphoreHandle_t snapshot_lock;

static const char *text(const cJSON *item, const char *key) {
    const cJSON *value = cJSON_GetObjectItemCaseSensitive(item, key);
    return cJSON_IsString(value) ? value->valuestring : "";
}

/* Wire-order hexadecimal, beginning with family byte 28 and ending with CRC.
   Espressif stores the ROM as a little-endian uint64_t; do not print it reversed. */
static void format_rom(uint64_t rom, char address[17]) {
    for (unsigned i = 0; i < 8; i++) snprintf(address + i * 2, 3, "%02x", (unsigned)((rom >> (i * 8)) & 255));
}

static void enumerate_bus(temperature_bus_t *bus) {
    onewire_device_iter_handle_t iterator = NULL;
    if (onewire_new_device_iter(bus->handle, &iterator) != ESP_OK) return;
    onewire_device_t device;
    /* Bound traversal, including unsupported families, on an untrusted wire. */
    for (unsigned attempts = 0; attempts < SENSOR_LIMIT && probe_count < SENSOR_LIMIT; attempts++) {
        if (onewire_device_iter_get_next(iterator, &device) != ESP_OK) break;
        char address[17]; format_rom(device.address, address);
        bool known = false;
        for (size_t i = 0; i < probe_count; i++) if (!strcmp(probes[i].address, address)) known = true;
        if (known) continue;
        ds18b20_config_t settings = {};
        ds18b20_device_handle_t handle = NULL;
        if (ds18b20_new_device_from_enumeration(&device, &settings, &handle) != ESP_OK) continue;
        temperature_probe_t *probe = &probes[probe_count++];
        snprintf(probe->bus_id, sizeof(probe->bus_id), "%s", bus->id);
        snprintf(probe->address, sizeof(probe->address), "%s", address);
        probe->handle = handle;
    }
    onewire_del_device_iter(iterator);
}

static void sample_task(void *unused) {
    (void)unused;
    for (;;) {
        for (size_t b = 0; b < bus_count; b++) {
            temperature_bus_t *bus = &buses[b];
            if (!bus->handle) continue;
            /* Discovery is periodically repeated so replacement/new sensors appear. */
            xSemaphoreTake(snapshot_lock, portMAX_DELAY);
            enumerate_bus(bus);
            xSemaphoreGive(snapshot_lock);
            const esp_err_t conversion = ds18b20_trigger_temperature_conversion_for_all(bus->handle);
            for (size_t i = 0; i < probe_count; i++) {
                if (strcmp(probes[i].bus_id, bus->id)) continue;
                float value = 0;
                const bool valid = conversion == ESP_OK && ds18b20_get_temperature(probes[i].handle, &value) == ESP_OK && isfinite(value) && value >= -55 && value <= 125;
                xSemaphoreTake(snapshot_lock, portMAX_DELAY);
                probes[i].valid = valid;
                probes[i].celsius = value;
                probes[i].sampled_ms = esp_timer_get_time() / 1000;
                xSemaphoreGive(snapshot_lock);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(3000));
    }
}

esp_err_t temperature_inputs_start(const diy_config_t *config) {
    snapshot_lock = xSemaphoreCreateMutex();
    if (!snapshot_lock) return ESP_ERR_NO_MEM;
    cJSON *root = cJSON_Parse(config->features.profile_json);
    if (!root) return ESP_ERR_NO_MEM;
    const cJSON *item = NULL;
    cJSON_ArrayForEach(item, cJSON_GetObjectItemCaseSensitive(root, "temperatureBuses")) {
        if (!config->setup_complete || !cJSON_IsTrue(cJSON_GetObjectItemCaseSensitive(item, "enabled")) || bus_count >= BUS_LIMIT) continue;
        const cJSON *pin = cJSON_GetObjectItemCaseSensitive(item, "gpio");
        if (!cJSON_IsNumber(pin) || !((pin->valueint >= 4 && pin->valueint <= 18) || pin->valueint == 21)) continue;
        temperature_bus_t *bus = &buses[bus_count++];
        snprintf(bus->id, sizeof(bus->id), "%s", text(item, "id"));
        bus->gpio = pin->valueint;
        onewire_bus_config_t settings = { .bus_gpio_num = bus->gpio };
        onewire_bus_rmt_config_t rmt = { .max_rx_bytes = 10 };
        /* A failed bus stays unavailable; it never becomes simulated telemetry. */
        if (onewire_new_bus_rmt(&settings, &rmt, &bus->handle) != ESP_OK) bus->handle = NULL;
    }
    cJSON_Delete(root);
    return xTaskCreate(sample_task, "temperature", 4096, NULL, 4, NULL) == pdPASS ? ESP_OK : ESP_ERR_NO_MEM;
}

cJSON *temperature_inputs_to_json(void) {
    cJSON *root = cJSON_CreateObject();
    cJSON *devices = cJSON_AddArrayToObject(root, "devices");
    if (!root || !devices || !snapshot_lock) { cJSON_Delete(root); return NULL; }
    xSemaphoreTake(snapshot_lock, portMAX_DELAY);
    const int64_t now_ms = esp_timer_get_time() / 1000;
    for (size_t i = 0; i < probe_count; i++) {
        cJSON *item = cJSON_CreateObject();
        cJSON_AddStringToObject(item, "busId", probes[i].bus_id);
        cJSON_AddStringToObject(item, "address", probes[i].address);
        cJSON_AddStringToObject(item, "status", !probes[i].valid ? "disconnected" : now_ms - probes[i].sampled_ms > 30000 ? "stale" : "ok");
        cJSON_AddNumberToObject(item, "ageMs", now_ms - probes[i].sampled_ms);
        if (probes[i].valid) cJSON_AddNumberToObject(item, "tempF", probes[i].celsius * 1.8f + 32);
        else cJSON_AddNullToObject(item, "tempF");
        cJSON_AddItemToArray(devices, item);
    }
    xSemaphoreGive(snapshot_lock);
    return root;
}
