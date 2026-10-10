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
frontend/               React dashboard, demo runtime and tests
firmware/esp32-s3/       ESP-IDF API, NVS, sensors and rule runtime
docs/                   API, manuals, BOM and delivery evidence
scripts/                Windows build and C host-test helpers
.github/                CI
```

The browser demo runs its controller in-process. A standalone Node bridge is a
future option; it is not a current prerequisite or repository folder.

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
- Demo runtime: browser controller with configuration and rule persistence
- Firmware: ESP-IDF for ESP32-S3
- Storage: firmware NVS plus browser demo storage
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


## Verified implementation checkpoint

Named DS18B20 sensor assignment, GPIO bus discovery, configuration-driven menus,
local rule execution, in-app/browser notifications and controller connection
forms are implemented. The firmware includes autonomous sensor-alert evaluation
and NVS rule storage. Equipment output drivers and additional telemetry sources
remain in progress. See [current status](docs/PROJECT_STATUS_2026-10-09.md) and
[delivery evidence](docs/DELIVERY_STATUS.md).

## Development Commands

```bash
cd frontend
npm install
npm test
npm run build

cd ../firmware/esp32-s3
pio run
pio run --target uploadfs
```

On Windows, from the repository root, use `./scripts/pio.ps1` to build firmware.
The script uses a verified directory junction when the repository name contains
spaces, which ESP-IDF's build tools do not support. It builds the same working
tree without copying sources. PlatformIO must be on PATH in the current shell.

```powershell
./scripts/pio.ps1
./scripts/pio.ps1 run --target buildfs
./scripts/pio.ps1 run --target upload
./scripts/pio.ps1 device monitor
./scripts/test-firmware.ps1
```

The ESP32 platform is pinned in `firmware/esp32-s3/platformio.ini`. A first build
installs ESP-IDF dependencies and compiles the SDK; let it finish. Upload commands
require a connected board and change its firmware; `buildfs` only creates an image.

`test-firmware.ps1` uses Visual Studio C++ Build Tools to execute the actual C
configuration validators and simulation tests on Windows. Build the firmware
first to obtain its cJSON and Unity dependencies. These host tests do not verify
physical wiring, device drivers, or electrical fault behavior. The complete
delivery checklist is in [docs/DELIVERY_STATUS.md](docs/DELIVERY_STATUS.md).
