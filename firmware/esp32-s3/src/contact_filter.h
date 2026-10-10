#pragma once
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    bool started;
    bool valid;
    bool candidate;
    bool value;
    uint64_t changed_ms;
} contact_filter_t;

void contact_filter_sample(contact_filter_t *filter, bool active, uint64_t now_ms, uint32_t debounce_ms);
