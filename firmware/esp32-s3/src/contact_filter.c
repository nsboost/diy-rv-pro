#include "contact_filter.h"

void contact_filter_sample(contact_filter_t *filter, bool active, uint64_t now_ms, uint32_t debounce_ms)
{
    if (!filter->started || filter->candidate != active || now_ms < filter->changed_ms) {
        filter->started = true;
        filter->candidate = active;
        filter->changed_ms = now_ms;
    }
    if (now_ms - filter->changed_ms >= debounce_ms) {
        filter->value = filter->candidate;
        filter->valid = true;
    }
}
