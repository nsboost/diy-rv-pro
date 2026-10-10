#include "automation_recovery_store.h"
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

esp_err_t automation_recovery_write(const automation_recovery_store_t *store,
                                    const void *payload, size_t payload_size) {
  if (!store || !store->read || !store->write || !store->commit ||
      !store->allocate || !store->release || !payload) return ESP_ERR_INVALID_ARG;
  if (!payload_size || payload_size > 65537) return ESP_ERR_INVALID_SIZE;
  size_t size = 0;
  void *original = NULL, *verified = NULL;
  esp_err_t result = store->read(store->context, "state", NULL, &size);
  if (result != ESP_OK) return result;
  if (!size || size > 65537) return ESP_ERR_INVALID_SIZE;
  const size_t original_size = size;
  original = store->allocate(store->context, size);
  verified = store->allocate(store->context, size);
  if (!original || !verified) { result = ESP_ERR_NO_MEM; goto done; }
  result = store->read(store->context, "state", original, &size);
  if (result != ESP_OK) goto done;
  if (size != original_size) { result = ESP_ERR_INVALID_SIZE; goto done; }
  char key[16];
  bool available = false;
  for (int slot = 0; slot < 8; slot++) {
    snprintf(key, sizeof(key), "backup%d", slot);
    size_t previous_size = 0;
    result = store->read(store->context, key, NULL, &previous_size);
    if (result == store->missing_error) { available = true; break; }
    if (result != ESP_OK) goto done;
  }
  if (!available) { result = store->full_error; goto done; }
  result = store->write(store->context, key, original, size);
  if (result == ESP_OK) result = store->commit(store->context);
  if (result != ESP_OK) goto done;
  size_t verified_size = size;
  result = store->read(store->context, key, verified, &verified_size);
  if (result != ESP_OK) goto done;
  if (verified_size != size || memcmp(original, verified, size)) { result = ESP_FAIL; goto done; }
  result = store->write(store->context, "state", payload, payload_size);
  if (result == ESP_OK) result = store->commit(store->context);
done:
  store->release(store->context, original);
  store->release(store->context, verified);
  return result;
}
