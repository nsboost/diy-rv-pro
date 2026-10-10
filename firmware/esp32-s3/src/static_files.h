#pragma once

#include "esp_err.h"
#include "esp_http_server.h"

esp_err_t static_files_mount(void);
esp_err_t static_files_send(httpd_req_t *request, const char *uri_path);
