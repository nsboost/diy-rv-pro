#pragma once
#include "security.h"
#include "esp_err.h"
#include "cJSON.h"

esp_err_t security_inputs_start(const diy_config_t *config);
esp_err_t security_inputs_configure(const diy_config_t *config);
cJSON *security_inputs_to_json(void);
