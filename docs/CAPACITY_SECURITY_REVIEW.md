# Capacity and Security Review

Date: 2026-07-05

## Current Target

- Board: ESP32-S3-DevKitC-1-N8 profile
- CPU: ESP32-S3 dual-core class target, 240 MHz
- RAM: 320 KB internal RAM, no PSRAM on the current board profile
- Flash: 8 MB
- Framework: ESP-IDF through PlatformIO
- Filesystem: SPIFFS

Partition layout after this review:

| Partition | Size | Purpose |
| --- | ---: | --- |
| `nvs` | 40 KB | Setup state, credentials, admin token hash, feature profile |
| `ota_0` | 2.5 MB | App slot A |
| `ota_1` | 2.5 MB | App slot B |
| `storage` | 2.875 MB | Web dashboard assets |

Current built frontend assets are about 630 KB, roughly 21 percent of the SPIFFS storage partition.

## Camera Decision

IP camera support is feasible as dashboard metadata and browser-rendered streams. It is not feasible or appropriate for this ESP32-S3 target to decode, transcode, proxy, or buffer RTSP/H.264 streams, especially without PSRAM.

The controller should store camera definitions such as label, role, protocol, snapshot URL, browser-safe stream URL, gateway name, and auth requirement. RTSP cameras should be bridged by a dedicated NVR or gateway such as go2rtc, Frigate, Home Assistant, or another appliance that exposes WebRTC, HLS, MJPEG, or snapshots.

This keeps camera traffic off the control MCU and avoids risking generator, HVAC, power, water, or security control responsiveness.

## I/O Expansion Strategy

The current firmware has configuration validation but no real hardware drivers yet. The schema allows GPIO `0..48` and relay channels `0..63`, but that is not a safe physical pin map. Before real outputs are enabled, add a board capability table that marks reserved, strapping, USB/JTAG, flash, input-only, ADC-capable, and relay-expander-backed pins.

Preferred expansion strategy:

- Use I2C GPIO expanders for door, window, tamper, motion, and other dry-contact inputs.
- Use 1-Wire or I2C for temperature sensors.
- Use RS-485/Modbus, CAN, or VE.Direct for power electronics instead of direct GPIO where possible.
- Use isolated inputs and relays for RV wiring.
- Treat BLE, Zigbee, Z-Wave, Wi-Fi, MQTT, Modbus, CAN, and UART devices as untrusted inputs until validated.

## Security and IoT Sensors

Motion sensors, door contacts, heartbeat/presence sensors, tamper inputs, leak sensors, panic inputs, and gateway-backed IoT devices are feasible. They should be modeled as explicit `securityZones` and `securitySensors`, not hidden inside generic custom I/O.

Required runtime behavior before these sensors control anything dangerous:

- Debounce and state confirmation for contact sensors.
- Tamper state tracking.
- Heartbeat timeout tracking for wireless/gateway devices.
- Low-battery reporting.
- Alarm/event history.
- Automation policy checks that prevent a single untrusted sensor from triggering dangerous actions without interlocks.

## Security Priorities

Priority 0: fail-safe physical outputs. Real drivers must default outputs off, require explicit arming, enforce interlocks and max runtimes, survive brownouts safely, and deny dangerous commands when config or telemetry confidence is bad.

Priority 1: replace plain bearer-over-HTTP with secure pairing and encrypted authenticated transport. Add rate limits, replay resistance, role separation, and session expiration.

Priority 2: enable secure boot, signed OTA, anti-rollback, flash encryption, and NVS encryption through a deliberate provisioning flow. Do not enable these casually in development builds without signing and recovery procedures.

Priority 3: require authorization for telemetry and WebSocket data before real occupancy, security, or camera metadata is exposed.

Priority 4: avoid browser `localStorage` for long-lived admin tokens. Prefer short-lived sessions or a pairing-derived local session token.

Priority 5: isolate camera and IoT networks from control traffic. Never embed camera credentials in dashboard-visible URLs when a gateway can broker access.

Priority 6: add audit logs for auth failures, pairing, config changes, control requests, OTA events, interlock trips, camera access, and security events.

Priority 7: add CI security gates: dependency audit, secret scanning, static analysis, firmware hardening checks, SBOM/signing verification, and auth/fail-safe tests.

## Build Verification (2026-09-30)

PlatformIO Core 6.1.19 completed the ESP32-S3 firmware build with Espressif32
7.0.1 and ESP-IDF 6.0.1. The SDK dependency setup and compilation took about
458 seconds, exceeding the earlier command timeouts. The ESP32 platform version
is now pinned. Run `./scripts/pio.ps1` from the repository root on Windows;
it validates or creates a no-space junction to the same source tree.

Verification also passed a fresh firmware rebuild with the pinned configuration
(414 seconds), a subsequent cached build using `./scripts/pio.ps1` (23 seconds),
and SPIFFS image generation. Outputs are `firmware.bin` (895,232 bytes including
image overhead) and `spiffs.bin` (3,014,656 bytes, the full filesystem partition
image) under `firmware/esp32-s3/.pio/build/esp32-s3-devkitc-1/`.

Measured linker usage:

| Resource | Used | Build limit | Remaining |
| --- | ---: | ---: | ---: |
| Application flash | 894,805 bytes (34.1%) | 2,621,440 bytes | 1,726,635 bytes |
| Static RAM | 61,504 bytes (18.8%) | 327,680 bytes | 266,176 bytes |

Static RAM figures exclude runtime heap allocations and task stacks allocated
at runtime. They are not a measurement of free heap under Wi-Fi, configuration,
or concurrent client load. CPU utilization and runtime memory headroom still
require measurements on hardware.
