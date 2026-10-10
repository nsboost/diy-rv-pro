#include "automation_engine.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const cJSON *get(const cJSON *object, const char *key) {
  return cJSON_GetObjectItemCaseSensitive(object, key);
}
static const char *str(const cJSON *object, const char *key) {
  const cJSON *item = get(object, key);
  return cJSON_IsString(item) ? item->valuestring : "";
}
static bool bounded(const cJSON *object, const char *key, size_t min,
                    size_t max) {
  const cJSON *item = get(object, key);
  return cJSON_IsString(item) && strlen(item->valuestring) >= min &&
         strlen(item->valuestring) <= max;
}
static bool number(const char *text, double *result) {
  char *end;
  if (!text || !*text)
    return false;
  *result = strtod(text, &end);
  while (*end == ' ')
    end++;
  return end != text && *end == '\0' && isfinite(*result);
}
static bool duration(const char *text, double *milliseconds) {
  double amount;
  char unit[12], tail;
  int count = sscanf(text, "%lf %11s %c", &amount, unit, &tail);
  if (count != 2 || !isfinite(amount) || amount < 0)
    return false;
  double scale;
  if (!strcmp(unit, "s") || !strcmp(unit, "sec") || !strcmp(unit, "second") ||
      !strcmp(unit, "seconds"))
    scale = 1000;
  else if (!strcmp(unit, "min") || !strcmp(unit, "minute") ||
           !strcmp(unit, "minutes"))
    scale = 60000;
  else if (!strcmp(unit, "h") || !strcmp(unit, "hour") ||
           !strcmp(unit, "hours"))
    scale = 3600000;
  else
    return false;
  *milliseconds = amount * scale;
  return *milliseconds <= 86400000;
}
static bool clock_minute(const char *value, double *minute) {
  if (strlen(value) != 5 || value[2] != ':' || value[0] < '0' ||
      value[0] > '9' || value[1] < '0' || value[1] > '9' || value[3] < '0' ||
      value[3] > '9' || value[4] < '0' || value[4] > '9')
    return false;
  int hour = (value[0] - '0') * 10 + value[1] - '0';
  int min = (value[3] - '0') * 10 + value[4] - '0';
  if (hour > 23 || min > 59)
    return false;
  *minute = hour * 60 + min;
  return true;
}
static bool expected_number(const cJSON *condition, double *value) {
  return !strcmp(str(condition, "source"), "time.local")
             ? clock_minute(str(condition, "value"), value)
             : number(str(condition, "value"), value);
}
static bool range(const cJSON *condition, double *low, double *high) {
  const char *value = str(condition, "value");
  if (!strcmp(str(condition, "source"), "time.local")) {
    int a, b, c, d;
    char tail;
    if (sscanf(value, "%2d:%2d-%2d:%2d%c", &a, &b, &c, &d, &tail) != 4 ||
        a < 0 || a > 23 || b < 0 || b > 59 || c < 0 || c > 23 || d < 0 ||
        d > 59)
      return false;
    *low = a * 60 + b;
    *high = c * 60 + d;
    return true;
  }
  char tail;
  return sscanf(value, "%lf , %lf %c", low, high, &tail) == 2 &&
         isfinite(*low) && isfinite(*high) && *low < *high;
}
static bool condition_valid(const cJSON *condition) {
  if (!cJSON_IsObject(condition) || !bounded(condition, "source", 1, 128))
    return false;
  const char *op = str(condition, "operator");
  double a, b;
  if (!strcmp(op, "changes"))
    return true;
  if (!bounded(condition, "value", 1, 256))
    return false;
  if (!strcmp(op, "between") || !strcmp(op, "outside"))
    return range(condition, &a, &b);
  if (!strcmp(str(condition, "source"), "time.local") &&
      !clock_minute(str(condition, "value"), &a))
    return false;
  if (!strcmp(op, "=") || !strcmp(op, "!="))
    return true;
  return (!strcmp(op, ">") || !strcmp(op, ">=") || !strcmp(op, "<") ||
          !strcmp(op, "<=")) &&
         expected_number(condition, &a);
}
static bool action_valid(const cJSON *action, bool restoring) {
  if (!cJSON_IsObject(action) || !bounded(action, "target", 1, 128))
    return false;
  const char *command = str(action, "command");
  const char *commands[] = {"turnOn",  "turnOff", "start",    "stop",
                            "open",    "close",   "blockOn",  "blockOff",
                            "unblock", "setAuto", "sendAlert"};
  bool found = false;
  for (size_t i = 0; i < sizeof(commands) / sizeof(commands[0]); i++)
    if (!strcmp(command, commands[i]))
      found = true;
  if (!found)
    return false;
  const cJSON *value = get(action, restoring ? "restoreValue" : "value");
  if (value && (!cJSON_IsString(value) || strlen(value->valuestring) > 256))
    return false;
  if (!strcmp(command, "sendAlert") &&
      strcmp(str(action, "target"), "notification"))
    return false;
  return true;
}
bool automation_validate_rule(const cJSON *rule, char *error,
                              size_t error_len) {
  double hold;
  const cJSON *reverse = get(rule, "reverse");
  bool valid =
      cJSON_IsObject(rule) && bounded(rule, "id", 1, 32) &&
      bounded(rule, "name", 3, 96) && cJSON_IsBool(get(rule, "enabled")) &&
      condition_valid(get(rule, "trigger")) &&
      duration(str(get(rule, "trigger"), "holdFor"), &hold) &&
      action_valid(get(rule, "action"), false) && cJSON_IsObject(reverse) &&
      cJSON_IsBool(get(reverse, "enabled")) &&
      (!cJSON_IsTrue(get(reverse, "enabled")) ||
       (condition_valid(reverse) && action_valid(reverse, true)));
  if (!valid && error && error_len)
    snprintf(error, error_len,
             "Rule identity, condition, duration or action is invalid");
  return valid;
}
bool automation_validate_rules(const cJSON *rules, char *error,
                               size_t error_len) {
  if (!cJSON_IsArray(rules) ||
      cJSON_GetArraySize(rules) > DIY_AUTOMATION_MAX_RULES) {
    if (error && error_len)
      snprintf(error, error_len, "Maximum 64 automation rules");
    return false;
  }
  const cJSON *item;
  cJSON_ArrayForEach(item, rules) {
    if (!automation_validate_rule(item, error, error_len))
      return false;
    for (const cJSON *other = item->next; other; other = other->next)
      if (!strcmp(str(item, "id"), str(other, "id"))) {
        if (error && error_len) {
          snprintf(error, error_len, "Duplicate automation identity");
        }
        return false;
      }
  }
  char *payload = cJSON_PrintUnformatted(rules);
  bool valid = payload && strlen(payload) < DIY_AUTOMATION_MAX_BYTES;
  cJSON_free(payload);
  if (!valid && error && error_len)
    snprintf(error, error_len,
             "Automation configuration exceeds storage limit");
  return valid;
}
bool automation_validate_saved_state(const cJSON *state, char *error,
                                     size_t error_len) {
  const cJSON *version = get(state, "version"),
              *alerts = get(state, "notifications");
  if (!cJSON_IsObject(state) || !cJSON_IsNumber(version) ||
      version->valuedouble != 1 || !cJSON_IsArray(alerts) ||
      cJSON_GetArraySize(alerts) > 64)
    goto invalid;
  if (!automation_validate_rules(get(state, "rules"), error, error_len))
    return false;
  const cJSON *item;
  cJSON_ArrayForEach(item, alerts) {
    const cJSON *uptime = get(item, "uptimeMs");
    if (!cJSON_IsObject(item) || !bounded(item, "id", 1, 32) ||
        !bounded(item, "message", 1, 256) || !bounded(item, "ruleId", 0, 32) ||
        !cJSON_IsBool(get(item, "read")) || !cJSON_IsNumber(uptime) ||
        !isfinite(uptime->valuedouble) || uptime->valuedouble < 0 ||
        (strcmp(str(item, "severity"), "info") &&
         strcmp(str(item, "severity"), "warning")))
      goto invalid;
    for (const cJSON *other = item->next; other; other = other->next)
      if (!strcmp(str(item, "id"), str(other, "id")))
        goto invalid;
  }
  return true;
invalid:
  if (error && error_len)
    snprintf(error, error_len, "Stored automation state is invalid");
  return false;
}
void automation_engine_reset(automation_engine_t *engine) {
  for (size_t i = 0; i < DIY_AUTOMATION_MAX_RULES; i++) {
    cJSON_Delete(engine->rules[i].previous);
    cJSON_Delete(engine->rules[i].previous_restore);
  }
  memset(engine, 0, sizeof(*engine));
}
static bool available(const cJSON *value) {
  return cJSON_IsBool(value) || cJSON_IsString(value) ||
         (cJSON_IsNumber(value) && isfinite(value->valuedouble));
}
static bool compare(const cJSON *condition, const cJSON *value,
                    const cJSON *previous) {
  if (!available(value))
    return false;
  const char *op = str(condition, "operator"),
             *expected = str(condition, "value");
  double low, high, wanted;
  if (!strcmp(op, "changes"))
    return available(previous) && !cJSON_Compare(value, previous, true);
  if (!strcmp(op, "between") || !strcmp(op, "outside")) {
    if (!cJSON_IsNumber(value) || !range(condition, &low, &high))
      return false;
    bool within =
        low <= high ? (value->valuedouble >= low && value->valuedouble <= high)
                    : (value->valuedouble >= low || value->valuedouble <= high);
    return !strcmp(op, "between") ? within : !within;
  }
  bool equal = false;
  if (cJSON_IsString(value))
    equal = !strcmp(value->valuestring, expected);
  else if (cJSON_IsBool(value)) {
    bool truth = !strcmp(expected, "on") || !strcmp(expected, "true") ||
                 !strcmp(expected, "connected") || !strcmp(expected, "running");
    bool falsity = !strcmp(expected, "off") || !strcmp(expected, "false") ||
                   !strcmp(expected, "disconnected") ||
                   !strcmp(expected, "stopped");
    if (!truth && !falsity)
      return false;
    equal = cJSON_IsTrue(value) == truth;
  } else if (cJSON_IsNumber(value) && expected_number(condition, &wanted))
    equal = value->valuedouble == wanted;
  if (!strcmp(op, "="))
    return equal;
  if (!strcmp(op, "!="))
    return !equal;
  if (!cJSON_IsNumber(value) || !expected_number(condition, &wanted))
    return false;
  if (!strcmp(op, ">"))
    return value->valuedouble > wanted;
  if (!strcmp(op, ">="))
    return value->valuedouble >= wanted;
  if (!strcmp(op, "<"))
    return value->valuedouble < wanted;
  if (!strcmp(op, "<="))
    return value->valuedouble <= wanted;
  return false;
}
static void remember(cJSON **previous, const cJSON *value) {
  cJSON_Delete(*previous);
  *previous = available(value) ? cJSON_Duplicate(value, true) : NULL;
}
void automation_engine_tick(automation_engine_t *engine, const cJSON *rules,
                            const cJSON *sources, uint64_t now_ms,
                            automation_executor_t execute, void *context) {
  const cJSON *pending_rules[DIY_AUTOMATION_MAX_RULES] = {0};
  const cJSON *actions[DIY_AUTOMATION_MAX_RULES] = {0};
  bool restoring[DIY_AUTOMATION_MAX_RULES] = {0};
  int index = 0;
  const cJSON *rule;
  cJSON_ArrayForEach(rule, rules) {
    if (index >= DIY_AUTOMATION_MAX_RULES)
      break;
    int slot = index++;
    automation_rule_state_t *state = &engine->rules[slot];
    if (strcmp(state->id, str(rule, "id"))) {
      cJSON_Delete(state->previous);
      cJSON_Delete(state->previous_restore);
      memset(state, 0, sizeof(*state));
      snprintf(state->id, sizeof(state->id), "%s", str(rule, "id"));
    }
    if (!cJSON_IsTrue(get(rule, "enabled"))) {
      state->active = false;
      state->holding = false;
      state->retry_ms = 0;
      continue;
    }
    const cJSON *trigger = get(rule, "trigger"),
                *reverse = get(rule, "reverse");
    const cJSON *value = get(sources, str(trigger, "source"));
    state->input_available = available(value);
    bool matches = compare(trigger, value, state->previous);
    remember(&state->previous, value);
    restoring[slot] = state->active && cJSON_IsTrue(get(reverse, "enabled"));
    bool ready = false;
    if (restoring[slot]) {
      const cJSON *restore = get(sources, str(reverse, "source"));
      ready = compare(reverse, restore, state->previous_restore);
      remember(&state->previous_restore, restore);
    } else if (!state->active && matches) {
      if (!state->holding) {
        state->holding = true;
        state->since_ms = now_ms;
      }
      double hold = 0;
      if (duration(str(trigger, "holdFor"), &hold))
        ready = now_ms >= state->since_ms && now_ms - state->since_ms >= hold;
    } else if (!matches) {
      state->holding = false;
      if (!cJSON_IsTrue(get(reverse, "enabled")))
        state->active = false;
    }
    if (ready && now_ms >= state->retry_ms) {
      pending_rules[slot] = rule;
      actions[slot] = restoring[slot] ? reverse : get(rule, "action");
    }
  }
  // Evaluate every condition once, then execute interlocks before equipment
  // actions.
  for (int pass = 0; pass < 2; pass++)
    for (int slot = 0; slot < index; slot++) {
      if (!pending_rules[slot] || !execute)
        continue;
      bool block = !strncmp(str(actions[slot], "command"), "block", 5);
      if (block != (pass == 0))
        continue;
      automation_rule_state_t *state = &engine->rules[slot];
      if (execute(pending_rules[slot], actions[slot], restoring[slot],
                  context)) {
        state->active = !restoring[slot];
        state->holding = false;
        state->retry_ms = 0;
      } else
        state->retry_ms = now_ms + 30000;
    }
}
