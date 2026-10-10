#include "config_store.h"

#include <string.h>

#include "esp_log.h"
#include "feature_config.h"
#include "nvs.h"
#include "nvs_flash.h"

static const char *TAG = "config_store";
static const char *NAMESPACE = "diyrv";

void config_store_defaults(diy_config_t *config)
{
    memset(config, 0, sizeof(*config));
    config->setup_complete = false;
    strlcpy(config->ap_ssid, "DIY-RV-PRO-SETUP", sizeof(config->ap_ssid));
    config->ap_password[0] = '\0';
    strlcpy(config->timezone, "America/Denver", sizeof(config->timezone));
    feature_config_defaults(&config->features);
}

void config_store_init(void)
{
    esp_err_t err = nvs_flash_init();
    if (err != ESP_OK)
        ESP_LOGE(TAG, "NVS initialization failed (%s); original storage retained. Explicit maintenance recovery is required; do not erase flash automatically.", esp_err_to_name(err));
    ESP_ERROR_CHECK(err);
}

esp_err_t config_store_load(diy_config_t *config)
{
    config_store_defaults(config);

    nvs_handle_t handle;
    esp_err_t err = nvs_open(NAMESPACE, NVS_READONLY, &handle);
    if (err == ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGW(TAG, "No saved configuration; first boot setup required");
        return ESP_OK;
    }
    if (err != ESP_OK) {
        return err;
    }

    uint8_t setup = 0;
    size_t token_len = sizeof(config->admin_token_hash);
    size_t ap_len = sizeof(config->ap_ssid);
    size_t ap_password_len = sizeof(config->ap_password);
    size_t sta_len = sizeof(config->station_ssid);
    size_t sta_password_len = sizeof(config->station_password);
    size_t tz_len = sizeof(config->timezone);
    size_t features_len = sizeof(config->features);

    nvs_get_u8(handle, "setup", &setup);
    nvs_get_str(handle, "token_hash", config->admin_token_hash, &token_len);
    nvs_get_str(handle, "ap_ssid", config->ap_ssid, &ap_len);
    nvs_get_str(handle, "ap_password", config->ap_password, &ap_password_len);
    nvs_get_str(handle, "sta_ssid", config->station_ssid, &sta_len);
    nvs_get_str(handle, "sta_password", config->station_password, &sta_password_len);
    nvs_get_str(handle, "timezone", config->timezone, &tz_len);
    err = nvs_get_blob(handle, "features", &config->features, &features_len);
    if (err != ESP_OK ||
        features_len != sizeof(config->features) ||
        config->features.schema_version != DIY_CONFIG_SCHEMA_VERSION ||
        config->features.profile_json[0] != '{') {
        ESP_LOGW(TAG, "Feature configuration missing or incompatible; using defaults");
        feature_config_defaults(&config->features);
    }
    nvs_close(handle);

    config->setup_complete = setup == 1 && config->admin_token_hash[0] != '\0' && strlen(config->ap_password) >= 8;
    return ESP_OK;
}

esp_err_t config_store_save(const diy_config_t *config)
{
    nvs_handle_t handle;
    esp_err_t err = nvs_open(NAMESPACE, NVS_READWRITE, &handle);
    if (err != ESP_OK) {
        return err;
    }

    err = nvs_set_u8(handle, "setup", config->setup_complete ? 1 : 0);
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "token_hash", config->admin_token_hash);
    }
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "ap_ssid", config->ap_ssid);
    }
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "ap_password", config->ap_password);
    }
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "sta_ssid", config->station_ssid);
    }
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "sta_password", config->station_password);
    }
    if (err == ESP_OK) {
        err = nvs_set_str(handle, "timezone", config->timezone);
    }
    if (err == ESP_OK) {
        err = nvs_set_blob(handle, "features", &config->features, sizeof(config->features));
    }
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }

    nvs_close(handle);
    return err;
}
