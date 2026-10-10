#pragma once
#include "cJSON.h"
#include "esp_err.h"
#include "security.h"
esp_err_t automation_runtime_start(const diy_config_t *config);
void automation_runtime_configure(const diy_config_t *config);
bool automation_runtime_control(const cJSON *command, char *error,
                                size_t error_len);
void automation_runtime_append(cJSON *telemetry);

void automation_runtime_inputs_pending(void);
