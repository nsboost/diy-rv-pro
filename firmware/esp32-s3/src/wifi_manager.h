#pragma once

#include "esp_err.h"
#include "security.h"

esp_err_t wifi_manager_start(const diy_config_t *config);
const char *wifi_manager_station_status(void);
