#pragma once

#include <stdbool.h>
#include <stddef.h>

#include "cJSON.h"
#include "esp_err.h"
#include "security.h"

void feature_config_defaults(diy_feature_config_t *features);
cJSON *feature_config_to_json(const diy_feature_config_t *features);
esp_err_t feature_config_update_from_json(diy_feature_config_t *features, const cJSON *json, char *error, size_t error_len);
