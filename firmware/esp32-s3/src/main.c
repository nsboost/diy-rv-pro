#include "automation_runtime.h"
#include "api_server.h"
#include "config_store.h"
#include "esp_log.h"
#include "mock_telemetry.h"
#include "security.h"
#include "security_inputs.h"
#include "temperature_inputs.h"
#include "static_files.h"
#include "wifi_manager.h"

static const char *TAG = "diy_rv_pro";

void app_main(void)
{
    static diy_config_t config;
    static mock_telemetry_t telemetry;
    static api_context_t api_context;

    ESP_LOGI(TAG, "DIY RV PRO booting on ESP32-S3");

    security_init();
    config_store_init();
    ESP_ERROR_CHECK(config_store_load(&config));
    ESP_ERROR_CHECK(security_inputs_start(&config));
    ESP_ERROR_CHECK(temperature_inputs_start(&config));
    mock_telemetry_init(&telemetry);
    ESP_ERROR_CHECK(automation_runtime_start(&config));
    ESP_ERROR_CHECK_WITHOUT_ABORT(static_files_mount());

    if (!config.setup_complete) {
        ESP_LOGW(TAG, "First boot setup is required before control endpoints will accept commands");
    }

    ESP_ERROR_CHECK(wifi_manager_start(&config));

    api_context.config = &config;
    api_context.telemetry = &telemetry;
    ESP_ERROR_CHECK(api_server_start(&api_context));
}
