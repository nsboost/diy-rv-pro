# DIY RV PRO

DIY RV PRO is a universal RV automation and monitoring platform built around the ESP32-S3 development board, a polished web dashboard, and a matching 7-inch touchscreen HMI experience.

The project is intended to become a commercial-grade RV control system. The interface should look and behave like a premium integrated RV product while the firmware and backend remain modular enough to support many RV layouts.

## Hardware Target

Primary controller platform:

- ESP32-S3 development board

The ESP32-S3 target replaces the earlier ESP32-C3 direction. Firmware, pin planning, peripheral abstraction, and build instructions should assume ESP32-S3 unless a future hardware revision explicitly changes that decision.

## UI Benchmark

The uploaded dashboard image is the target visual benchmark. The finished UI must be equal to or better than that reference.

Required visual characteristics:

- Dark premium dashboard styling
- Left-side navigation rail
- Large top status bar with controller, Wi-Fi, time, date, alerts, settings, and theme controls
- High-density card layout
- Battery, solar, loads, shore power, inverter, weather, generator, HVAC, tank, event, and automation panels
- Time-series power history graph
- Realistic populated demo data
- Color-coded status indicators
- Clean glass and industrial visual treatment
- 7-inch HMI compatibility

Required pages:

- Dashboard
- Climate
- Power
- Tanks
- Generator
- Automation
- History
- Settings
- Setup Wizard

## Repository Structure

```text
frontend/          Web dashboard and demo UI
backend/           Local/demo API bridge, mock telemetry, WebSocket service
firmware/          ESP32-S3 firmware
hardware/          Pinouts, wiring notes, board docs
assets/            Logo, UI assets, product images
docs/              Detailed product, wiring, setup, and architecture docs
automation/        Rule schemas and automation engine design
scripts/           Developer/build/deployment helpers
tests/             Frontend, backend, firmware, and integration tests
```

## Major Functional Areas

- Shore power monitoring
- Inverter and converter monitoring
- Battery bank monitoring
- Solar input monitoring
- Generator status and configuration
- Multi-zone HVAC interface
- Furnace and air conditioner interface
- Water heater and water pump interface
- Fresh, grey, black, and LP tank monitoring
- Interior, exterior, and equipment temperature monitoring
- User-defined automation and alert rules

## Development Stack

Expected stack:

- Frontend: React and Vite
- Backend demo bridge: Node.js with WebSocket and REST endpoints
- Firmware: ESP-IDF for ESP32-S3
- Storage: firmware NVS plus demo configuration files
- CI: GitHub Actions

## Documentation Set

Top-level planning docs:

- `PROJECT_BRIEF.md`
- `ARCHITECTURE.md`
- `TASKS.md`
- `DECISIONS.md`
- `SETUP.md`
- `AGENTS.md`

Additional docs should later be added under `docs/` for wiring, BOM, pinouts, manual, installation, firmware flashing, OTA, and HMI deployment.

## Current Priorities

1. Build the polished populated web dashboard matching the uploaded UI reference
2. Add backend mock telemetry bridge
3. Establish ESP32-S3 firmware skeleton
4. Define hardware pinout and wiring strategy
5. Create setup wizard and automation schemas
6. Add realistic graphs, events, tank levels, climate panels, generator data, and power states
