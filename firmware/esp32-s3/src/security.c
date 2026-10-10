#include "security.h"

#include <string.h>

#include "psa/crypto.h"

static void bytes_to_hex(const unsigned char *bytes, size_t length, char *output)
{
    static const char alphabet[] = "0123456789abcdef";

    for (size_t i = 0; i < length; ++i) {
        output[i * 2] = alphabet[(bytes[i] >> 4) & 0x0f];
        output[(i * 2) + 1] = alphabet[bytes[i] & 0x0f];
    }

    output[length * 2] = '\0';
}

void security_init(void)
{
}

bool security_hash_token(const char *token, char *output_hex, size_t output_len)
{
    if (token == NULL || output_hex == NULL || output_len < DIY_AUTH_TOKEN_HEX_LENGTH + 1) {
        return false;
    }

    unsigned char digest[DIY_AUTH_TOKEN_BYTES] = {0};
    size_t digest_len = 0;

    if (psa_crypto_init() != PSA_SUCCESS) {
        return false;
    }

    if (psa_hash_compute(
            PSA_ALG_SHA_256,
            (const unsigned char *) token,
            strlen(token),
            digest,
            sizeof(digest),
            &digest_len) != PSA_SUCCESS ||
        digest_len != sizeof(digest)) {
        return false;
    }

    bytes_to_hex(digest, sizeof(digest), output_hex);
    return true;
}

bool security_constant_time_equal(const char *left, const char *right)
{
    if (left == NULL || right == NULL) {
        return false;
    }

    const size_t left_len = strlen(left);
    const size_t right_len = strlen(right);
    unsigned char diff = (unsigned char) (left_len ^ right_len);
    const size_t max_len = left_len > right_len ? left_len : right_len;

    for (size_t i = 0; i < max_len; ++i) {
        const unsigned char l = i < left_len ? (unsigned char) left[i] : 0;
        const unsigned char r = i < right_len ? (unsigned char) right[i] : 0;
        diff |= (unsigned char) (l ^ r);
    }

    return diff == 0;
}

bool security_authorize_header(const diy_config_t *config, const char *authorization_header)
{
    if (config == NULL || !config->setup_complete || authorization_header == NULL) {
        return false;
    }

    const char prefix[] = "Bearer ";
    if (strncmp(authorization_header, prefix, strlen(prefix)) != 0) {
        return false;
    }

    char candidate_hash[DIY_AUTH_TOKEN_HEX_LENGTH + 1] = {0};
    if (!security_hash_token(authorization_header + strlen(prefix), candidate_hash, sizeof(candidate_hash))) {
        return false;
    }

    return security_constant_time_equal(candidate_hash, config->admin_token_hash);
}
