idf_component_register(
  SRCS
    "api_server.c"
    "config_store.c"
    "feature_config.c"
    "sensor_validation.c"
        "automation_engine.c"
        "automation_sources.c"
        "automation_runtime.c"
    "main.c"
    "mock_telemetry.c"
    "security.c"
    "security_inputs.c"
    "temperature_inputs.c"
    "contact_filter.c"
    "static_files.c"
    "wifi_manager.c"
  INCLUDE_DIRS "."
  REQUIRES
    esp_http_server
    esp_wifi
    nvs_flash
    cjson
    mbedtls
    spiffs
    esp_driver_gpio
    esp_timer
)

# Catch large automatic buffers before they overflow the HTTP task stack.
target_compile_options(${COMPONENT_LIB} PRIVATE -Werror=frame-larger-than=2048)
