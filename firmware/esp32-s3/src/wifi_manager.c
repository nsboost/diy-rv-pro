#include "wifi_manager.h"

#include <string.h>

#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"

static const char *TAG = "wifi_manager";

esp_err_t wifi_manager_start(const diy_config_t *config)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    esp_netif_create_default_wifi_ap();
    if (config->station_ssid[0] != '\0') {
        esp_netif_create_default_wifi_sta();
    }

    wifi_init_config_t init_config = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init_config));

    wifi_config_t ap_config = {0};
    strlcpy((char *) ap_config.ap.ssid, config->ap_ssid, sizeof(ap_config.ap.ssid));
    ap_config.ap.ssid_len = strlen(config->ap_ssid);
    ap_config.ap.channel = 6;
    ap_config.ap.max_connection = 4;
    ap_config.ap.authmode = WIFI_AUTH_WPA2_PSK;

    if (!config->setup_complete) {
        ap_config.ap.authmode = WIFI_AUTH_OPEN;
        memset(ap_config.ap.password, 0, sizeof(ap_config.ap.password));
    } else {
        strlcpy((char *) ap_config.ap.password, config->ap_password, sizeof(ap_config.ap.password));
    }

    ESP_ERROR_CHECK(esp_wifi_set_mode(config->station_ssid[0] != '\0' ? WIFI_MODE_APSTA : WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_config));

    if (config->station_ssid[0] != '\0') {
        wifi_config_t sta_config = {0};
        strlcpy((char *) sta_config.sta.ssid, config->station_ssid, sizeof(sta_config.sta.ssid));
        strlcpy((char *) sta_config.sta.password, config->station_password, sizeof(sta_config.sta.password));
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_config));
    }

    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_LOGI(TAG, "Wi-Fi started in %s mode with AP SSID %s",
             config->station_ssid[0] != '\0' ? "APSTA" : "AP",
             config->ap_ssid);
    return ESP_OK;
}
