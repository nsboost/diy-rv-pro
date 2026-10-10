#pragma once
#include <stddef.h>
#include "esp_err.h"

typedef struct {
  void *context;
  esp_err_t (*read)(void *, const char *, void *, size_t *);
  esp_err_t (*write)(void *, const char *, const void *, size_t);
  esp_err_t (*commit)(void *);
  void *(*allocate)(void *, size_t);
  void (*release)(void *, void *);
  esp_err_t missing_error;
  esp_err_t full_error;
} automation_recovery_store_t;

/* Caller serializes access and validates the disabled-rule replacement first.
 * A committed, byte-verified backup always precedes replacement. Commit failure
 * leaves application uncertain; this is not a multi-key atomic transaction. */
esp_err_t automation_recovery_write(const automation_recovery_store_t *store,
                                    const void *payload, size_t payload_size);
