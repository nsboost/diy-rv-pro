#include "wifi_manager.h"

#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <stdatomic.h>

#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "esp_timer.h"
#include "esp_netif_sntp.h"
#include "timezone_lookup.h"

static const char *TAG = "wifi_manager";
static esp_timer_handle_t reconnect_timer;
static esp_netif_t *station_netif;
static atomic_bool clock_synchronized;
static atomic_bool timezone_valid;
static bool sntp_started;

static void clock_sync(struct timeval *value)
{
    (void)value;
    atomic_store(&clock_synchronized, true);
}

int wifi_manager_local_minute(void)
{
    if (!timezone_valid || !atomic_load(&clock_synchronized)) return -1;
    time_t now = time(NULL);
    struct tm local;
    if (!localtime_r(&now, &local)) return -1;
    return local.tm_hour * 60 + local.tm_min;
}

const char *wifi_manager_station_status(void)
{
    if (!station_netif) return "disabled";
    wifi_ap_record_t ap;
    esp_netif_ip_info_t ip = {0};
    if (esp_wifi_sta_get_ap_info(&ap) == ESP_OK &&
        esp_netif_get_ip_info(station_netif, &ip) == ESP_OK && ip.ip.addr != 0) {
        return "connected";
    }
    return "connecting";
}

static void schedule_reconnect(void)
{
    // A single pending retry prevents disconnect events from creating a tight loop.
    esp_err_t result = esp_timer_start_once(reconnect_timer, 5000000);
    if (result != ESP_OK && result != ESP_ERR_INVALID_STATE) {
        ESP_LOGW(TAG, "Could not schedule station reconnect: %s", esp_err_to_name(result));
    }
}

static void connect_station(void *context)
{
    (void)context;
    esp_err_t result = esp_wifi_connect();
    if (result != ESP_OK) {
        ESP_LOGW(TAG, "Station connection attempt failed: %s", esp_err_to_name(result));
        schedule_reconnect();
    }
}

static void station_event(void *context, esp_event_base_t base, int32_t id, void *data)
{
    (void)context;
    (void)data;
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        connect_station(NULL);
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "Station disconnected; retrying in five seconds. Local AP remains available.");
        schedule_reconnect();
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        esp_timer_stop(reconnect_timer);
        ESP_LOGI(TAG, "Station connected and obtained an IP address");
        if (!sntp_started && esp_netif_sntp_start() == ESP_OK) sntp_started = true;
    }
}

esp_err_t wifi_manager_start(const diy_config_t *config)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    const char *timezone = diy_timezone_posix(config->timezone);
    timezone_valid = timezone && setenv("TZ", timezone, 1) == 0;
    if (timezone_valid) tzset();

    esp_netif_create_default_wifi_ap();
    if (config->station_ssid[0] != '\0') {
        station_netif = esp_netif_create_default_wifi_sta();
        esp_sntp_config_t clock_config = ESP_NETIF_SNTP_DEFAULT_CONFIG("pool.ntp.org");
        clock_config.start = false;
        clock_config.sync_cb = clock_sync;
        ESP_ERROR_CHECK(esp_netif_sntp_init(&clock_config));
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
        const esp_timer_create_args_t retry_args = {
            .callback = connect_station,
            .name = "wifi_reconnect"
        };
        ESP_ERROR_CHECK(esp_timer_create(&retry_args, &reconnect_timer));
        ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, station_event, NULL));
        ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, station_event, NULL));
    }

    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_LOGI(TAG, "Wi-Fi started in %s mode with AP SSID %s",
             config->station_ssid[0] != '\0' ? "APSTA" : "AP",
             config->ap_ssid);
    return ESP_OK;
}
