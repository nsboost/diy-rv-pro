#pragma once
#include "cJSON.h"
#include <stdbool.h>

// Caller owns the returned flat source object. Pending input configuration,
// unavailable probes and stale samples never supply actionable temperatures.
cJSON *automation_temperature_sources(const cJSON *profile,
                                      const cJSON *devices,
                                      bool inputs_pending);
