#pragma once
#include "security.h"
#include "esp_err.h"
#include "cJSON.h"
esp_err_t temperature_inputs_start(const diy_config_t *config);
cJSON *temperature_inputs_to_json(void);
