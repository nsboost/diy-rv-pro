# Architecture

## High-Level System

DIY RV PRO is organized as a three-layer product:

```text
Web Dashboard / 7-inch HMI
        |
REST + WebSocket API
        |
Backend Demo Bridge or ESP32-S3 Local API
        |
ESP32-S3 Firmware
        |
RV Sensors, Relays, Inputs, Outputs, and Interfaces
```

The project must support both demo mode and hardware mode.

- Demo mode uses a backend service with realistic simulated telemetry.
- Hardware mode uses the ESP32-S3 controller as the live data and control source.

## Repository Architecture

```text
frontend/
  React/Vite dashboard and HMI UI

backend/
  Node.js mock telemetry bridge, REST API, WebSocket API, demo state engine

firmware/
  ESP-IDF project for ESP32-S3

hardware/
  Pinouts, wiring notes, board assumptions, IO mapping

automation/
  Rule schema, example automations, validation models

assets/
  Logo, screenshots, icons, and product UI references

docs/
  Installation, manual, BOM, firmware flashing, OTA, HMI deployment

scripts/
  Build, setup, development, and release scripts

tests/
  Frontend, backend, firmware, and integration tests
```

## Frontend Architecture

Expected stack:

- React
- Vite
- TypeScript preferred
- Component-driven dashboard
- Charting for historical telemetry
- REST for initial state
- WebSocket for live state

Main frontend domains:

- Layout shell
- Left navigation
- Top status bar
- Dashboard cards
- Power page
- Climate page
- Tanks page
- Generator page
- Automation page
- History page
- Settings page
- Setup Wizard

The uploaded dashboard screenshot is the visual benchmark. Styling should maintain the premium dark glass dashboard appearance with compact, high-information panels.

## Backend Architecture

The backend bridge exists to support development before full hardware integration.

Backend responsibilities:

- Serve current system state
- Stream telemetry over WebSocket
- Provide realistic mock data
- Store demo configuration
- Simulate event history
- Simulate automation rule states
- Provide the same API shape expected from hardware mode

Suggested services:

```text
backend/src/server.ts
backend/src/state/systemState.ts
backend/src/telemetry/mockTelemetry.ts
backend/src/routes/systemRoutes.ts
backend/src/ws/telemetrySocket.ts
backend/src/automation/ruleEngine.ts
backend/src/config/demoConfig.ts
```

## Firmware Architecture

Firmware target:

- ESP32-S3
- ESP-IDF
- FreeRTOS
- NVS configuration storage

Recommended firmware layout:

```text
firmware/
  CMakeLists.txt
  sdkconfig.defaults
  partitions.csv
  main/
    app_main.c
    system_manager.c
    wifi_manager.c
    api_server.c
    telemetry_service.c
    automation_engine.c
    config_store.c
    io_manager.c
    sensor_manager.c
    fault_manager.c
  components/
    hal_gpio/
    hal_adc/
    hal_relay/
    rv_power/
    rv_generator/
    rv_climate/
    rv_tanks/
    rv_water/
```

## Firmware Task Model

Recommended FreeRTOS task split:

| Task | Purpose |
|---|---|
| system_task | Startup, mode control, watchdog coordination |
| telemetry_task | Periodic sensor sampling and state publishing |
| control_task | Output decisions and command execution |
| api_task | Local REST/WebSocket service |
| wifi_task | Wi-Fi provisioning and reconnect handling |
| automation_task | Rule evaluation |
| storage_task | NVS reads/writes and config persistence |
| fault_task | Fault detection, logging, and safe-state handling |

## Hardware Abstraction

The hardware abstraction layer must isolate the application from board pin choices.

Required abstractions:

- Digital inputs
- Relay outputs
- Analog inputs
- PWM outputs
- Temperature sensors
- Tank sensors
- Generator feedback inputs
- Power monitor inputs

Board-specific pin mapping should live in a board profile, not inside subsystem logic.

## Data Model

Core state domains:

```text
system
power
generator
climate
tanks
water
temperatures
automation
events
alerts
settings
```

Frontend, backend, and firmware should converge on the same state model so demo mode can transition into hardware mode without rewriting the UI.

## Automation Architecture

Rule structure:

```text
trigger -> conditions -> actions -> limits -> notifications
```

Automation must be explicit and user-defined. Default templates may be provided, but the user must be able to enable, disable, and adjust them.

## Setup Wizard Architecture

The setup wizard configures the system profile:

- Coach layout
- Battery chemistry and capacity
- Solar capacity
- Generator type and start method
- HVAC type and zone mapping
- Tank capacities and calibration
- Water pump and water heater configuration
- Sensor assignments
- Output assignments
- Alert thresholds
- Automation templates

## OTA and Update Architecture

Firmware should eventually use:

- Dual OTA partitions
- Rollback-capable update flow
- Version reporting
- Update validation
- Failure recovery path

## HMI Architecture

The 7-inch HMI should use the same design system as the web dashboard. The UI should be responsive enough to run as:

- Desktop web demo
- Tablet-style web panel
- 7-inch touchscreen interface
- Later mobile application reference
