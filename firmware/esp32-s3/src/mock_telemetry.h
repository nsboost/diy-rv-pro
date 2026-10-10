#pragma once

#include <stdbool.h>

#include "cJSON.h"

typedef struct {
    bool generator_running;
    bool automation_quiet_hours;
    int zone_1_setpoint;
    int zone_2_setpoint;
    int sequence;
} mock_telemetry_t;

void mock_telemetry_init(mock_telemetry_t *state);
void mock_telemetry_tick(mock_telemetry_t *state);
cJSON *mock_telemetry_to_json(const mock_telemetry_t *state);
bool mock_telemetry_apply_control(mock_telemetry_t *state, const cJSON *command, char *error, int error_len);
