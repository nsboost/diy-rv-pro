#pragma once
#include "cJSON.h"
#include <stdbool.h>

// Caller owns the returned flat source object. Pending input configuration,
// unavailable probes and stale samples never supply actionable temperatures.
cJSON *automation_temperature_sources(const cJSON *profile,
                                      const cJSON *devices,
                                      bool inputs_pending);

void automation_security_sources(cJSON *sources, const cJSON *profile, const cJSON *readings);

bool automation_input_configuration_changed(const cJSON *previous, const cJSON *next);

bool automation_temperature_bus_configuration_changed(const cJSON *previous, const cJSON *next);
