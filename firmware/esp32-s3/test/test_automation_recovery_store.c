#include "automation_recovery_store.h"
#include "unity.h"
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

#define MISSING 9001
#define FULL 9002
typedef struct { bool present; size_t size; unsigned char bytes[64]; } record_t;
typedef struct {
  record_t stored[9], staged[9];
  bool staged_valid[9], corrupt_backup, verified, changed_original_size;
  unsigned operations, fail_operation, allocations, fail_allocation, outstanding;
  unsigned primary_writes, commits;
} mock_store_t;
static const unsigned char original[] = {0,255,123,0,128};
static const unsigned char replacement[] = "disabled replacement";
static int index_for(const char *key) {
  if (!strcmp(key,"state")) return 0;
  if (strlen(key)==7 && !strncmp(key,"backup",6) && key[6]>='0' && key[6]<='7') return key[6]-'0'+1;
  return -1;
}
static esp_err_t read_record(void *context,const char *key,void *bytes,size_t *size) {
  mock_store_t *mock=context;
  if (++mock->operations==mock->fail_operation) return ESP_FAIL;
  int index=index_for(key);
  if (index<0 || !mock->stored[index].present) return MISSING;
  record_t *record=&mock->stored[index];
  if (bytes) {
    if (*size<record->size) return ESP_ERR_INVALID_SIZE;
    memcpy(bytes,record->bytes,record->size);
    if (index>0) {
      mock->verified=true;
      if (mock->corrupt_backup) ((unsigned char *)bytes)[0]^=1;
    }
  }
  *size=record->size;
  if (bytes && !index && mock->changed_original_size) (*size)--;
  return ESP_OK;
}
static esp_err_t write_record(void *context,const char *key,const void *bytes,size_t size) {
  mock_store_t *mock=context;
  if (++mock->operations==mock->fail_operation) return ESP_FAIL;
  int index=index_for(key);
  if (index<0 || size>64) return ESP_ERR_INVALID_SIZE;
  if (!index) {
    TEST_ASSERT_TRUE(mock->verified);
    TEST_ASSERT_TRUE(mock->commits>=1);
    mock->primary_writes++;
  } else TEST_ASSERT_FALSE(mock->stored[index].present);
  mock->staged[index].present=true;
  mock->staged[index].size=size;
  memcpy(mock->staged[index].bytes,bytes,size);
  mock->staged_valid[index]=true;
  return ESP_OK;
}
static esp_err_t commit_record(void *context) {
  mock_store_t *mock=context;
  if (++mock->operations==mock->fail_operation) return ESP_FAIL;
  for (int i=0;i<9;i++) if (mock->staged_valid[i]) {
    mock->stored[i]=mock->staged[i];mock->staged_valid[i]=false;
  }
  mock->commits++;
  return ESP_OK;
}
static void *allocate_record(void *context,size_t size) {
  mock_store_t *mock=context;
  if (++mock->allocations==mock->fail_allocation) return NULL;
  void *bytes=malloc(size);if(bytes)mock->outstanding++;return bytes;
}
static void release_record(void *context,void *bytes) {
  if(bytes)((mock_store_t *)context)->outstanding--;free(bytes);
}
static void initialize(mock_store_t *mock) {
  memset(mock,0,sizeof(*mock));mock->stored[0].present=true;
  mock->stored[0].size=sizeof(original);memcpy(mock->stored[0].bytes,original,sizeof(original));
}
static esp_err_t recover(mock_store_t *mock) {
  automation_recovery_store_t store={mock,read_record,write_record,commit_record,allocate_record,release_record,MISSING,FULL};
  return automation_recovery_write(&store,replacement,sizeof(replacement));
}
static void test_recovery_commits_exact_binary_backup_before_replacement(void) {
  mock_store_t mock;initialize(&mock);
  TEST_ASSERT_EQUAL(ESP_OK,recover(&mock));
  TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[1].bytes,sizeof(original));
  TEST_ASSERT_EQUAL_MEMORY(replacement,mock.stored[0].bytes,sizeof(replacement));
  TEST_ASSERT_EQUAL(2,mock.commits);TEST_ASSERT_EQUAL(1,mock.primary_writes);
  TEST_ASSERT_EQUAL(0,mock.outstanding);
}
static void test_recovery_injected_io_failures_preserve_original_or_committed_backup(void) {
  mock_store_t baseline;initialize(&baseline);TEST_ASSERT_EQUAL(ESP_OK,recover(&baseline));
  for(unsigned step=1;step<=baseline.operations;step++) {
    mock_store_t mock;initialize(&mock);mock.fail_operation=step;
    TEST_ASSERT_EQUAL(ESP_FAIL,recover(&mock));TEST_ASSERT_EQUAL(0,mock.outstanding);
    if(mock.primary_writes) {
      TEST_ASSERT_TRUE(mock.stored[1].present);
      TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[1].bytes,sizeof(original));
    } else TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[0].bytes,sizeof(original));
  }
}
static void test_recovery_allocation_and_verification_failures_never_replace_state(void) {
  for(unsigned failure=1;failure<=2;failure++) {
    mock_store_t mock;initialize(&mock);mock.fail_allocation=failure;
    TEST_ASSERT_EQUAL(ESP_ERR_NO_MEM,recover(&mock));
    TEST_ASSERT_EQUAL(0,mock.primary_writes);TEST_ASSERT_EQUAL(0,mock.outstanding);
  }
  mock_store_t mock;initialize(&mock);mock.corrupt_backup=true;
  TEST_ASSERT_EQUAL(ESP_FAIL,recover(&mock));TEST_ASSERT_EQUAL(0,mock.primary_writes);
  TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[0].bytes,sizeof(original));
  TEST_ASSERT_EQUAL(0,mock.outstanding);
  initialize(&mock);mock.changed_original_size=true;
  TEST_ASSERT_EQUAL(ESP_ERR_INVALID_SIZE,recover(&mock));
  TEST_ASSERT_EQUAL(0,mock.primary_writes);TEST_ASSERT_EQUAL(0,mock.outstanding);
}
static void test_recovery_full_slots_and_unreadable_sizes_never_overwrite_backups(void) {
  mock_store_t mock;initialize(&mock);
  for(int i=1;i<9;i++)mock.stored[i]=mock.stored[0];
  TEST_ASSERT_EQUAL(FULL,recover(&mock));TEST_ASSERT_EQUAL(0,mock.primary_writes);
  for(int i=0;i<9;i++)TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[i].bytes,sizeof(original));
  initialize(&mock);mock.stored[1]=mock.stored[0];mock.stored[1].bytes[0]=42;
  TEST_ASSERT_EQUAL(ESP_OK,recover(&mock));
  TEST_ASSERT_EQUAL(42,mock.stored[1].bytes[0]);
  TEST_ASSERT_EQUAL_MEMORY(original,mock.stored[2].bytes,sizeof(original));
  initialize(&mock);mock.stored[0].present=false;
  TEST_ASSERT_EQUAL(MISSING,recover(&mock));TEST_ASSERT_EQUAL(0,mock.primary_writes);
  for(int i=0;i<2;i++) {
    initialize(&mock);mock.stored[0].size=i ? 65538 : 0;
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_SIZE,recover(&mock));
    TEST_ASSERT_EQUAL(0,mock.allocations);TEST_ASSERT_EQUAL(0,mock.primary_writes);
  }
}
void run_automation_recovery_store_tests(void) {
  RUN_TEST(test_recovery_commits_exact_binary_backup_before_replacement);
  RUN_TEST(test_recovery_injected_io_failures_preserve_original_or_committed_backup);
  RUN_TEST(test_recovery_allocation_and_verification_failures_never_replace_state);
  RUN_TEST(test_recovery_full_slots_and_unreadable_sizes_never_overwrite_backups);
}
