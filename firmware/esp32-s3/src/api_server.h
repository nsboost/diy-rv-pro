#pragma once

#include "esp_err.h"
#include "mock_telemetry.h"
#include "security.h"

typedef struct {
    diy_config_t *config;
    mock_telemetry_t *telemetry;
} api_context_t;

esp_err_t api_server_start(api_context_t *context);
