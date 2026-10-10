# DIY RV PRO

Configurable RV automation and monitoring platform.

## Project Objective
DIY RV PRO is a universal DIY RV controller platform built around an ESP32-S3 architecture with a touchscreen/web interface, configurable automation engine, telemetry visualization, and modular hardware abstraction.

The platform is intended to support:
- Generator automation/control
- HVAC multi-zone control
- Shore/inverter/power management
- Battery and solar monitoring
- Tank monitoring
- Camera dashboard tiles via external IP camera/NVR/gateway streams
- Security and IoT sensor monitoring
- User-programmable automation
- Historical telemetry and graphing
- Mobile/web interface
- Setup/configuration wizard

## Architecture
- Frontend: React/Vite static dashboard designed to be served by the ESP32-S3
- Firmware: ESP-IDF on ESP32-S3 with local HTTP/WebSocket API
- Backend Bridge: optional development tooling only

## Repository Structure
```text
frontend/
firmware/
docs/
assets/
```

## Current Status
First major milestone scaffold is in active implementation:
- screenshot-inspired local dashboard
- mock telemetry and safe simulated controls
- ESP-IDF firmware API skeleton
- first-boot local auth and NVS-backed configuration boundary
- versioned universal RV feature profile and configurator for HVAC, power, solar, generator, breakers, tanks, water heat, pumps, temperatures, cameras, security sensors, and custom I/O

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
