#include "automation_runtime.h"
#include "api_server.h"

#include <stdlib.h>
#include <string.h>

#include "config_store.h"
#include "esp_check.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "feature_config.h"
#include "security_inputs.h"
#include "temperature_inputs.h"
#include "static_files.h"
#include "wifi_manager.h"
#include "cJSON.h"

static const char *TAG = "api_server";

static api_context_t *server_context;
static bool security_config_pending;
static bool temperature_config_pending;

static esp_err_t security_inputs_handler(httpd_req_t *request);

static esp_err_t send_json(httpd_req_t *request, cJSON *json, int status)
{
    const char *status_line = "200 OK";
    if (status == 202) {
        status_line = "202 Accepted";
    } else if (status == 400) {
        status_line = "400 Bad Request";
    } else if (status == 401) {
        status_line = "401 Unauthorized";
    }
    httpd_resp_set_status(request, status_line);
    httpd_resp_set_type(request, "application/json");
    httpd_resp_set_hdr(request, "Cache-Control", "no-store");
    char *payload = cJSON_PrintUnformatted(json);
    if (payload == NULL) {
        cJSON_Delete(json);
        return httpd_resp_send_err(request, HTTPD_500_INTERNAL_SERVER_ERROR, "JSON serialization failed");
    }
    esp_err_t result = httpd_resp_sendstr(request, payload);
    cJSON_free(payload);
    cJSON_Delete(json);
    return result;
}

static bool request_is_authorized(httpd_req_t *request)
{
    char authorization[160] = {0};
    if (httpd_req_get_hdr_value_str(request, "Authorization", authorization, sizeof(authorization)) != ESP_OK) {
        return false;
    }
    return security_authorize_header(server_context->config, authorization);
}

static esp_err_t index_handler(httpd_req_t *request)
{
    return static_files_send(request, "/index.html");
}

static esp_err_t static_asset_handler(httpd_req_t *request)
{
    return static_files_send(request, request->uri);
}

static esp_err_t status_handler(httpd_req_t *request)
{
    cJSON *root = cJSON_CreateObject();
    cJSON_AddBoolToObject(root, "online", true);
    cJSON_AddBoolToObject(root, "setupComplete", server_context->config->setup_complete);
    cJSON_AddStringToObject(root, "firmware", "v1.2.7");
    cJSON_AddStringToObject(root, "target", "esp32-s3");
    cJSON_AddStringToObject(root, "stationStatus", wifi_manager_station_status());
    return send_json(request, root, 200);
}

static esp_err_t telemetry_handler(httpd_req_t *request)
{
    if (!request_is_authorized(request)) return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    mock_telemetry_tick(server_context->telemetry);
    cJSON *snapshot = mock_telemetry_to_json(server_context->telemetry);
    automation_runtime_append(snapshot);
    return send_json(request, snapshot, 200);
}

static esp_err_t temperature_handler(httpd_req_t *request)
{
    if (!request_is_authorized(request)) return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    if (temperature_config_pending) { httpd_resp_set_status(request, "503 Service Unavailable"); return httpd_resp_sendstr(request, "Restart controller to apply temperature bus changes"); }
    return send_json(request, temperature_inputs_to_json(), 200);
}

static esp_err_t config_get_handler(httpd_req_t *request)
{
    if (server_context->config->setup_complete && !request_is_authorized(request)) {
        return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    }

    cJSON *root = cJSON_CreateObject();
    cJSON_AddBoolToObject(root, "setupComplete", server_context->config->setup_complete);
    cJSON_AddStringToObject(root, "apSsid", server_context->config->ap_ssid);
    cJSON_AddStringToObject(root, "stationSsid", server_context->config->station_ssid);
    cJSON_AddStringToObject(root, "timezone", server_context->config->timezone);
    cJSON_AddBoolToObject(root, "authRequired", true);
    cJSON_AddItemToObject(root, "features", feature_config_to_json(&server_context->config->features));
    return send_json(request, root, 200);
}

static esp_err_t read_body_alloc(httpd_req_t *request, char **body, size_t max_len)
{
    int remaining = request->content_len;
    if (remaining <= 0 || remaining > (int) max_len) {
        return ESP_FAIL;
    }

    char *buffer = calloc((size_t) remaining + 1, sizeof(char));
    if (buffer == NULL) {
        return ESP_ERR_NO_MEM;
    }

    int offset = 0;
    while (remaining > 0) {
        const int received = httpd_req_recv(request, buffer + offset, remaining);
        if (received <= 0) {
            free(buffer);
            return ESP_FAIL;
        }
        offset += received;
        remaining -= received;
    }
    buffer[offset] = '\0';
    *body = buffer;
    return ESP_OK;
}

static esp_err_t config_put_handler(httpd_req_t *request)
{
    if (server_context->config->setup_complete && !request_is_authorized(request)) {
        return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    }

    char *body = NULL;
    if (read_body_alloc(request, &body, 32768) != ESP_OK) {
        return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "Invalid configuration body");
    }

    cJSON *json = cJSON_Parse(body);
    free(body);
    if (json == NULL) {
        return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "Configuration body must be valid JSON");
    }

    const cJSON *admin_token = cJSON_GetObjectItemCaseSensitive(json, "adminToken");
    const cJSON *ap_ssid = cJSON_GetObjectItemCaseSensitive(json, "apSsid");
    const cJSON *ap_password = cJSON_GetObjectItemCaseSensitive(json, "apPassword");
    const cJSON *station_ssid = cJSON_GetObjectItemCaseSensitive(json, "stationSsid");
    const cJSON *station_password = cJSON_GetObjectItemCaseSensitive(json, "stationPassword");
    const cJSON *timezone = cJSON_GetObjectItemCaseSensitive(json, "timezone");
    const cJSON *features = cJSON_GetObjectItemCaseSensitive(json, "features");

    diy_config_t *candidate = malloc(sizeof(*candidate));
    if (candidate == NULL) {
        cJSON_Delete(json);
        return httpd_resp_send_err(request, HTTPD_500_INTERNAL_SERVER_ERROR, "Insufficient memory to update configuration");
    }
    *candidate = *server_context->config;

    if (!candidate->setup_complete) {
        if (!cJSON_IsString(admin_token) || strlen(admin_token->valuestring) < 16) {
            free(candidate);
            cJSON_Delete(json);
            return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "First boot setup requires a 16+ character admin token");
        }
        if (!cJSON_IsString(ap_password) || strlen(ap_password->valuestring) < 8) {
            free(candidate);
            cJSON_Delete(json);
            return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "First boot setup requires an 8+ character AP password");
        }
        if (!security_hash_token(admin_token->valuestring, candidate->admin_token_hash, sizeof(candidate->admin_token_hash))) {
            free(candidate);
            cJSON_Delete(json);
            return httpd_resp_send_err(request, HTTPD_500_INTERNAL_SERVER_ERROR, "Could not initialize credentials");
        }
        candidate->setup_complete = true;
    }

    if (cJSON_IsString(ap_ssid)) {
        strlcpy(candidate->ap_ssid, ap_ssid->valuestring, sizeof(candidate->ap_ssid));
    }
    if (cJSON_IsString(ap_password)) {
        if (strlen(ap_password->valuestring) < 8) {
            free(candidate);
            cJSON_Delete(json);
            return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "AP password must be at least 8 characters");
        }
        strlcpy(candidate->ap_password, ap_password->valuestring, sizeof(candidate->ap_password));
    }
    if (cJSON_IsString(station_ssid)) {
        strlcpy(candidate->station_ssid, station_ssid->valuestring, sizeof(candidate->station_ssid));
    }
    if (cJSON_IsString(station_password)) {
        strlcpy(candidate->station_password, station_password->valuestring, sizeof(candidate->station_password));
    }
    if (cJSON_IsString(timezone)) {
        strlcpy(candidate->timezone, timezone->valuestring, sizeof(candidate->timezone));
    }
    if (features != NULL) {
        char error[128] = {0};
        if (feature_config_update_from_json(&candidate->features, features, error, sizeof(error)) != ESP_OK) {
            free(candidate);
            cJSON_Delete(json);
            return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, error[0] ? error : "Invalid feature configuration");
        }
    }

    cJSON_Delete(json);
    esp_err_t save_result = config_store_save(candidate);
    if (save_result != ESP_OK) {
        free(candidate);
        ESP_LOGE(TAG, "Failed to save configuration: %s", esp_err_to_name(save_result));
        return httpd_resp_send_err(request, HTTPD_500_INTERNAL_SERVER_ERROR, "Configuration could not be saved");
    }
    *server_context->config = *candidate;
    free(candidate);
    temperature_config_pending = true;
    automation_runtime_inputs_pending();
    automation_runtime_configure(server_context->config);
    security_config_pending = security_inputs_configure(server_context->config) != ESP_OK;

    cJSON *response = cJSON_CreateObject();
    cJSON_AddBoolToObject(response, "temperatureInputsRequireRestart", temperature_config_pending);
    cJSON_AddBoolToObject(response, "securityInputsRequireRestart", security_config_pending);
    cJSON_AddBoolToObject(response, "setupComplete", server_context->config->setup_complete);
    cJSON_AddStringToObject(response, "apSsid", server_context->config->ap_ssid);
    cJSON_AddStringToObject(response, "stationSsid", server_context->config->station_ssid);
    cJSON_AddStringToObject(response, "timezone", server_context->config->timezone);
    cJSON_AddBoolToObject(response, "authRequired", true);
    cJSON_AddItemToObject(response, "features", feature_config_to_json(&server_context->config->features));
    return send_json(request, response, 200);
}

static esp_err_t security_inputs_handler(httpd_req_t *request)
{
    if (!request_is_authorized(request)) {
        return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    }
    if (security_config_pending) {
        httpd_resp_set_status(request, "503 Service Unavailable");
        httpd_resp_set_type(request, "text/plain");
        httpd_resp_set_hdr(request, "Cache-Control", "no-store");
        return httpd_resp_sendstr(request, "Saved sensor configuration requires restart");
    }
    cJSON *snapshot = security_inputs_to_json();
    if (!snapshot) return httpd_resp_send_err(request, HTTPD_500_INTERNAL_SERVER_ERROR, "Sensor snapshot unavailable");
    return send_json(request, snapshot, 200);
}

static esp_err_t control_handler(httpd_req_t *request)
{
    if (!request_is_authorized(request)) {
        return httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    }

    char *body = NULL;
    if (read_body_alloc(request, &body, 4096) != ESP_OK) {
        return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "Invalid control body");
    }

    cJSON *json = cJSON_Parse(body);
    free(body);
    char error[96] = {0};
    const cJSON *type = cJSON_GetObjectItemCaseSensitive(json, "type");
    const bool managed = cJSON_IsString(type) && (!strncmp(type->valuestring,"automation.",11) || !strncmp(type->valuestring,"notification.",13));
    const bool applied = json != NULL && (managed ? automation_runtime_control(json,error,sizeof(error)) : mock_telemetry_apply_control(server_context->telemetry, json, error, sizeof(error)));
    cJSON_Delete(json);

    if (!applied) {
        return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, error[0] ? error : "Unsupported control action");
    }

    cJSON *response = cJSON_CreateObject();
    cJSON_AddBoolToObject(response, "accepted", true);
    cJSON_AddStringToObject(response, "mode", managed ? "controller" : "simulation");
    return send_json(request, response, 202);
}

static esp_err_t websocket_handler(httpd_req_t *request)
{
    if (request->method == HTTP_GET) {
        return request_is_authorized(request) ? ESP_OK : httpd_resp_send_err(request, HTTPD_401_UNAUTHORIZED, "Authentication required");
    }

    httpd_ws_frame_t frame = {0};
    frame.type = HTTPD_WS_TYPE_TEXT;
    cJSON *json = mock_telemetry_to_json(server_context->telemetry);
    automation_runtime_append(json);
    char *payload = cJSON_PrintUnformatted(json);
    frame.payload = (uint8_t *) payload;
    frame.len = strlen(payload);
    esp_err_t result = httpd_ws_send_frame(request, &frame);
    cJSON_free(payload);
    cJSON_Delete(json);
    return result;
}

esp_err_t api_server_start(api_context_t *context)
{
    server_context = context;

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.uri_match_fn = httpd_uri_match_wildcard;
    config.max_uri_handlers = 12;

    httpd_handle_t server = NULL;
    ESP_RETURN_ON_ERROR(httpd_start(&server, &config), TAG, "Failed to start HTTP server");

    const httpd_uri_t routes[] = {
        {.uri = "/", .method = HTTP_GET, .handler = index_handler},
        {.uri = "/api/status", .method = HTTP_GET, .handler = status_handler},
        {.uri = "/api/telemetry", .method = HTTP_GET, .handler = telemetry_handler},
        {.uri = "/api/temperature/devices", .method = HTTP_GET, .handler = temperature_handler},
        {.uri = "/api/security/inputs", .method = HTTP_GET, .handler = security_inputs_handler},
        {.uri = "/api/config", .method = HTTP_GET, .handler = config_get_handler},
        {.uri = "/api/config", .method = HTTP_PUT, .handler = config_put_handler},
        {.uri = "/api/control", .method = HTTP_POST, .handler = control_handler},
        {.uri = "/ws/telemetry", .method = HTTP_GET, .handler = websocket_handler, .is_websocket = true},
        {.uri = "/*", .method = HTTP_GET, .handler = static_asset_handler}
    };

    for (size_t i = 0; i < sizeof(routes) / sizeof(routes[0]); ++i) {
        ESP_ERROR_CHECK(httpd_register_uri_handler(server, &routes[i]));
    }

    ESP_LOGI(TAG, "HTTP API server started");
    return ESP_OK;
}
