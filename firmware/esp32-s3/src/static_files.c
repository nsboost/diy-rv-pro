#include "static_files.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"
#include "esp_spiffs.h"

static const char *TAG = "static_files";
static const char *BASE_PATH = "/spiffs";
static const char FALLBACK_HTML[] =
    "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    "<title>DIY RV PRO</title></head><body style=\"font-family:sans-serif;background:#02070d;color:#f5f8fc\">"
    "<h1>DIY RV PRO</h1><p>Dashboard build not found. Run the frontend build and upload the SPIFFS image.</p>"
    "</body></html>";

esp_err_t static_files_mount(void)
{
    esp_vfs_spiffs_conf_t conf = {
        .base_path = BASE_PATH,
        .partition_label = "storage",
        .max_files = 8,
        .format_if_mount_failed = false,
    };

    esp_err_t err = esp_vfs_spiffs_register(&conf);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "SPIFFS mount failed: %s", esp_err_to_name(err));
        return err;
    }

    size_t total = 0;
    size_t used = 0;
    err = esp_spiffs_info("storage", &total, &used);
    if (err == ESP_OK) {
        ESP_LOGI(TAG, "SPIFFS mounted: %u of %u bytes used", (unsigned int) used, (unsigned int) total);
    }

    return err;
}

static const char *content_type_for_path(const char *path)
{
    const char *extension = strrchr(path, '.');
    if (extension == NULL) {
        return "application/octet-stream";
    }
    if (strcmp(extension, ".html") == 0) {
        return "text/html";
    }
    if (strcmp(extension, ".css") == 0) {
        return "text/css";
    }
    if (strcmp(extension, ".js") == 0) {
        return "application/javascript";
    }
    if (strcmp(extension, ".json") == 0) {
        return "application/json";
    }
    if (strcmp(extension, ".svg") == 0) {
        return "image/svg+xml";
    }
    if (strcmp(extension, ".png") == 0) {
        return "image/png";
    }
    if (strcmp(extension, ".woff2") == 0) {
        return "font/woff2";
    }
    return "application/octet-stream";
}

static void set_static_security_headers(httpd_req_t *request)
{
    httpd_resp_set_hdr(request, "X-Content-Type-Options", "nosniff");
    httpd_resp_set_hdr(request, "X-Frame-Options", "DENY");
    httpd_resp_set_hdr(request, "Referrer-Policy", "no-referrer");
    httpd_resp_set_hdr(request, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    httpd_resp_set_hdr(
        request,
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob: http: https:; "
        "media-src 'self' blob: http: https:; "
        "connect-src 'self' http: https: ws: wss:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'");
}

esp_err_t static_files_send(httpd_req_t *request, const char *uri_path)
{
    char file_path[160] = {0};
    const char *clean_path = (uri_path == NULL || strcmp(uri_path, "/") == 0) ? "/index.html" : uri_path;

    if (strstr(clean_path, "..") != NULL) {
        return httpd_resp_send_err(request, HTTPD_400_BAD_REQUEST, "Invalid static asset path");
    }

    snprintf(file_path, sizeof(file_path), "%s%s", BASE_PATH, clean_path);
    FILE *file = fopen(file_path, "rb");
    if (file == NULL && strcmp(clean_path, "/index.html") != 0) {
        snprintf(file_path, sizeof(file_path), "%s/index.html", BASE_PATH);
        file = fopen(file_path, "rb");
    }

    if (file == NULL) {
        httpd_resp_set_type(request, "text/html");
        set_static_security_headers(request);
        return httpd_resp_send(request, FALLBACK_HTML, HTTPD_RESP_USE_STRLEN);
    }

    httpd_resp_set_type(request, content_type_for_path(file_path));
    set_static_security_headers(request);
    httpd_resp_set_hdr(request, "Cache-Control", strstr(file_path, "/assets/") != NULL ? "public, max-age=31536000, immutable" : "no-cache");

    char chunk[1024];
    size_t read_bytes = 0;
    esp_err_t result = ESP_OK;

    while ((read_bytes = fread(chunk, 1, sizeof(chunk), file)) > 0) {
        result = httpd_resp_send_chunk(request, chunk, read_bytes);
        if (result != ESP_OK) {
            break;
        }
    }

    fclose(file);
    if (result == ESP_OK) {
        result = httpd_resp_send_chunk(request, NULL, 0);
    }
    return result;
}
