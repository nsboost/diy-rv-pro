#pragma once
#include <stdbool.h>
#include <stddef.h>
#include "cJSON.h"
bool sensor_inventory_validate(const cJSON *root, char *error, size_t error_len);
