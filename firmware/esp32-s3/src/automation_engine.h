#pragma once
#include "cJSON.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define DIY_AUTOMATION_MAX_RULES 64
#define DIY_AUTOMATION_MAX_BYTES 32768

typedef struct {
  char id[33];
  bool active;
  bool holding;
  uint64_t since_ms;
  uint64_t retry_ms;
  cJSON *previous;
  cJSON *previous_restore;
} automation_rule_state_t;

typedef struct {
  automation_rule_state_t rules[DIY_AUTOMATION_MAX_RULES];
} automation_engine_t;
typedef bool (*automation_executor_t)(const cJSON *rule, const cJSON *action,
                                      bool restoring, void *context);

bool automation_validate_rule(const cJSON *rule, char *error, size_t error_len);
bool automation_validate_rules(const cJSON *rules, char *error,
                               size_t error_len);
void automation_engine_reset(automation_engine_t *engine);
// Sources are a flat object keyed by stable source ID. Missing/null values
// never match. Caller serializes edits and ticks; only successful execution
// latches activation.
void automation_engine_tick(automation_engine_t *engine, const cJSON *rules,
                            const cJSON *sources, uint64_t now_ms,
                            automation_executor_t execute, void *context);
