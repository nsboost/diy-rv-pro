#pragma once

#include "esp_err.h"
#include "security.h"

void config_store_init(void);
esp_err_t config_store_load(diy_config_t *config);
esp_err_t config_store_save(const diy_config_t *config);
void config_store_defaults(diy_config_t *config);
