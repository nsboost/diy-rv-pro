#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define DIY_AUTH_TOKEN_BYTES 32
#define DIY_AUTH_TOKEN_HEX_LENGTH 64
#define DIY_CONFIG_SCHEMA_VERSION 1
#define DIY_FEATURE_PROFILE_MAX_BYTES 24576

typedef struct {
    uint16_t schema_version;
    char profile_json[DIY_FEATURE_PROFILE_MAX_BYTES];
} diy_feature_config_t;

typedef struct {
    bool setup_complete;
    char admin_token_hash[DIY_AUTH_TOKEN_HEX_LENGTH + 1];
    char ap_ssid[33];
    char ap_password[65];
    char station_ssid[33];
    char station_password[65];
    char timezone[40];
    diy_feature_config_t features;
} diy_config_t;

void security_init(void);
bool security_hash_token(const char *token, char *output_hex, size_t output_len);
bool security_constant_time_equal(const char *left, const char *right);
bool security_authorize_header(const diy_config_t *config, const char *authorization_header);
