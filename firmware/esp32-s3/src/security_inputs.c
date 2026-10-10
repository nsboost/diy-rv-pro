#include "security_inputs.h"
#include "contact_filter.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include <stdio.h>
#include <string.h>

#define INPUT_LIMIT 64
#define DEBOUNCE_MS 50

typedef struct {
    char id[33];
    char label[49];
    const char *status;
    int pin;
    bool normally_closed;
    contact_filter_t filter;
    uint64_t sampled_ms;
} security_input_t;

static security_input_t inputs[INPUT_LIMIT];
static size_t input_count;
static SemaphoreHandle_t input_lock;

static bool string_is(const cJSON *item, const char *key, const char *value)
{
    const cJSON *field = cJSON_GetObjectItemCaseSensitive(item, key);
    return cJSON_IsString(field) && strcmp(field->valuestring, value) == 0;
}

static bool pin_referenced_elsewhere(const cJSON *root, const cJSON *owner, int pin)
{
    const char *keys[] = {"gpio", "senseGpio", "tempSensorGpio", "runSenseGpio", "rpmInputGpio", "tamperGpio", "adcChannel"};
    const cJSON *section = NULL;
    cJSON_ArrayForEach(section, root) {
        if (!cJSON_IsArray(section)) continue;
        const cJSON *item = NULL;
        cJSON_ArrayForEach(item, section) {
            if (item == owner || !cJSON_IsObject(item)) continue;
            for (size_t k = 0; k < sizeof(keys) / sizeof(keys[0]); ++k) {
                const cJSON *field = cJSON_GetObjectItemCaseSensitive(item, keys[k]);
                if (cJSON_IsNumber(field) && field->valueint == pin) return true;
            }
        }
    }
    return false;
}

esp_err_t security_inputs_configure(const diy_config_t *config)
{
    if (!input_lock || !config) return ESP_ERR_INVALID_STATE;
    cJSON *root = cJSON_Parse(config->features.profile_json);
    if (!root) return ESP_ERR_NO_MEM;
    xSemaphoreTake(input_lock, portMAX_DELAY);
    for (size_t i = 0; i < input_count; ++i) {
        if (inputs[i].pin >= 0) gpio_reset_pin(inputs[i].pin);
    }
    memset(inputs, 0, sizeof(inputs));
    input_count = 0;
    const cJSON *item = NULL;
    cJSON_ArrayForEach(item, cJSON_GetObjectItemCaseSensitive(root, "securitySensors")) {
        if (input_count >= INPUT_LIMIT) break;
        security_input_t *input = &inputs[input_count++];
        input->pin = -1;
        const cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        const cJSON *label = cJSON_GetObjectItemCaseSensitive(item, "label");
        snprintf(input->id, sizeof(input->id), "%s", cJSON_IsString(id) ? id->valuestring : "");
        snprintf(input->label, sizeof(input->label), "%s", cJSON_IsString(label) ? label->valuestring : "");
        input->status = "disabled";
        if (!config->setup_complete || !cJSON_IsTrue(cJSON_GetObjectItemCaseSensitive(item, "enabled"))) continue;
        input->status = "unsupported";
        if (!string_is(item, "inputType", "digital-gpio")) continue;
        const cJSON *tamper = cJSON_GetObjectItemCaseSensitive(item, "tamperGpio");
        if (cJSON_IsNumber(tamper) && tamper->valueint >= 0) {
            input->status = "unsupported-tamper";
            continue;
        }
        if (!string_is(item, "contactPolarity", "normally-closed") && !string_is(item, "contactPolarity", "normally-open")) continue;
        input->normally_closed = string_is(item, "contactPolarity", "normally-closed");
        const cJSON *gpio = cJSON_GetObjectItemCaseSensitive(item, "gpio");
        input->status = "unassigned";
        if (!cJSON_IsNumber(gpio) || gpio->valuedouble != gpio->valueint || gpio->valueint < 0) continue;
        const int pin = gpio->valueint;
        input->status = "reserved-pin";
        /* Conservative N8 bench subset: excludes flash, boot straps, USB and console. */
        if (!((pin >= 4 && pin <= 18) || pin == 21)) continue;
        input->status = "pin-conflict";
        if (pin_referenced_elsewhere(root, item, pin)) continue;
        gpio_config_t settings = {
            .pin_bit_mask = 1ULL << pin,
            .mode = GPIO_MODE_INPUT,
            .pull_up_en = GPIO_PULLUP_ENABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        input->status = "hardware-error";
        if (gpio_config(&settings) != ESP_OK) continue;
        input->pin = pin;
        input->status = "initializing";
    }
    xSemaphoreGive(input_lock);
    cJSON_Delete(root);
    return ESP_OK;
}

static void sample_task(void *argument)
{
    (void) argument;
    for (;;) {
        xSemaphoreTake(input_lock, portMAX_DELAY);
        uint64_t now = (uint64_t) esp_timer_get_time() / 1000;
        for (size_t i = 0; i < input_count; ++i) {
            security_input_t *input = &inputs[i];
            if (input->pin < 0) continue;
            bool high = gpio_get_level(input->pin) != 0;
            contact_filter_sample(&input->filter, input->normally_closed ? high : !high, now, DEBOUNCE_MS);
            input->sampled_ms = now;
            if (input->filter.valid) input->status = "ok";
        }
        xSemaphoreGive(input_lock);
        vTaskDelay(pdMS_TO_TICKS(10) > 0 ? pdMS_TO_TICKS(10) : 1);
    }
}

esp_err_t security_inputs_start(const diy_config_t *config)
{
    if (input_lock) return ESP_ERR_INVALID_STATE;
    input_lock = xSemaphoreCreateMutex();
    if (!input_lock) return ESP_ERR_NO_MEM;
    esp_err_t result = security_inputs_configure(config);
    if (result != ESP_OK) return result;
    return xTaskCreate(sample_task, "security_inputs", 3072, NULL, 3, NULL) == pdPASS ? ESP_OK : ESP_ERR_NO_MEM;
}

cJSON *security_inputs_to_json(void)
{
    cJSON *root = cJSON_CreateObject();
    if (!root) return NULL;
    cJSON_AddStringToObject(root, "source", "hardware");
    cJSON_AddBoolToObject(root, "alarmSystemCommissioned", false);
    cJSON *array = cJSON_AddArrayToObject(root, "sensors");
    if (!array) { cJSON_Delete(root); return NULL; }
    xSemaphoreTake(input_lock, portMAX_DELAY);
    uint64_t now = (uint64_t) esp_timer_get_time() / 1000;
    for (size_t i = 0; i < input_count; ++i) {
        const security_input_t *input = &inputs[i];
        cJSON *item = cJSON_CreateObject();
        if (!item) { xSemaphoreGive(input_lock); cJSON_Delete(root); return NULL; }
        cJSON_AddItemToArray(array, item);
        bool stale = input->filter.valid && now - input->sampled_ms > 1000;
        cJSON_AddStringToObject(item, "id", input->id);
        cJSON_AddStringToObject(item, "label", input->label);
        cJSON_AddStringToObject(item, "status", stale ? "stale" : input->status);
        if (input->filter.valid && !stale) cJSON_AddBoolToObject(item, "active", input->filter.value);
        else cJSON_AddNullToObject(item, "active");
        cJSON_AddBoolToObject(item, "supervised", false);
    }
    xSemaphoreGive(input_lock);
    return root;
}
