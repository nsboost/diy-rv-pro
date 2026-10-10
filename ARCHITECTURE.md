# Architecture

## High-Level Structure

```text
React/Vite Dashboard
  -> ESP32-S3 static asset hosting
  -> ESP-IDF HTTP + WebSocket API
  -> Mock-first hardware services
  -> Future real drivers for RV I/O
```

## Frontend

The frontend is a code-native React dashboard designed to be built as static assets and served by the ESP32-S3. During development it can run with Vite and the local simulated controller in `frontend/src/api/telemetryClient.js`.

Responsibilities:
- Dashboard UI matching the RV control console reference
- Local telemetry rendering
- Safe simulated control actions
- Setup/configuration screens as the product matures
- Responsive tablet, desktop, and phone layouts

## Firmware

The firmware is an ESP-IDF application for the ESP32-S3.

Responsibilities:
- Wi-Fi AP/station startup
- NVS-backed configuration
- First-boot admin token setup
- Versioned RV feature profile for tanks, generator, HVAC zones, and power sensors
- HTTP API and WebSocket telemetry
- Mock battery, solar, loads, tanks, HVAC, generator, inverter, and weather state
- Rejection of unauthenticated control commands

The RV feature profile is the boundary between the setup UI and the physical controller. It is stored as a bounded, schema-versioned JSON profile in NVS so the controller can support highly different RV layouts without reflashing for every equipment mix. It defaults to every hardware feature disabled, then stores only the selected sensor, communications, relay, GPIO, ADC, and timing strategies for the installed RV. Real driver modules should check this profile before enabling any physical output.

The profile covers RV identity, HVAC zones, standalone temperature monitoring, solar charge controllers, inverters/chargers, batteries, generators, AC breakers, DC circuits, water/fluid tanks, water heaters, water pumps, propane/fuel systems, weather inputs, camera metadata, security zones, security sensors, and custom I/O.

Camera support is intentionally metadata-first. The ESP32-S3 stores bounded camera definitions and can report camera health or event metadata, but it should not decode, transcode, proxy, or buffer RTSP/H.264 video. RTSP cameras should be bridged by an external NVR or gateway into browser-consumable WebRTC, HLS, MJPEG, or snapshot URLs.

## Runtime API

```text
GET  /api/status
GET  /api/telemetry
GET  /api/config
PUT  /api/config
POST /api/control
WS   /ws/telemetry
```

See `docs/API.md` for request and authorization details.

## Firmware Structure

```text
firmware/esp32-s3/
  platformio.ini
  partitions.csv
  sdkconfig.defaults
  src/
    api_server.*
    config_store.*
    feature_config.*
    main.c
    mock_telemetry.*
    security.*
    wifi_manager.*
```
