# Setup

## Overview

This document describes the expected local development setup for DIY RV PRO.

The project has three primary development areas:

- Frontend web dashboard
- Backend demo bridge
- ESP32-S3 firmware

## Required Tools

Install:

- Git
- Node.js LTS
- npm
- Python 3
- VS Code
- ESP-IDF
- USB serial driver required by the selected ESP32-S3 development board

Recommended VS Code extensions:

- ESP-IDF
- C/C++
- ESLint
- Prettier
- GitLens

## Clone Repository

```bash
git clone https://github.com/nsboost/diy-rv-pro.git
cd diy-rv-pro
```

## Frontend Setup

Expected frontend folder:

```bash
cd frontend
npm install
npm run dev
```

The frontend should provide the polished dashboard and pages matching the uploaded UI benchmark.

Expected pages:

- Dashboard
- Climate
- Power
- Tanks
- Generator
- Automation
- History
- Settings
- Setup Wizard

## Backend Setup

Expected backend folder:

```bash
cd backend
npm install
npm run dev
```

Backend responsibilities:

- Current system state endpoint
- WebSocket telemetry stream
- Mock data generator
- Demo event log
- Demo automation state
- Demo configuration persistence

## Firmware Setup

Firmware target:

- ESP32-S3
- ESP-IDF

Expected firmware folder:

```bash
cd firmware
idf.py set-target esp32s3
idf.py build
```

Flash example:

```bash
idf.py -p /dev/ttyUSB0 flash monitor
```

Windows example:

```bash
idf.py -p COM3 flash monitor
```

## Expected Firmware Files

```text
firmware/
  CMakeLists.txt
  sdkconfig.defaults
  partitions.csv
  main/
    app_main.c
```

## Demo Mode

Demo mode should run without physical RV hardware.

Minimum demo behavior:

- Show controller as online
- Stream realistic battery, solar, load, tank, HVAC, generator, and weather values
- Populate recent events
- Populate automation status
- Display power history graph
- Allow page navigation
- Allow settings and setup wizard interaction

## Hardware Mode

Hardware mode will eventually connect the frontend directly or indirectly to the ESP32-S3 controller.

Expected firmware capabilities:

- Wi-Fi provisioning
- Local API
- Telemetry publication
- Configuration storage
- Sensor sampling
- Output control
- Fault reporting
- Firmware version reporting

## Environment Variables

A later `.env.example` should define backend and frontend variables such as:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
PORT=3000
DEMO_MODE=true
```

## Validation Checklist

Before considering a development environment ready:

- [ ] Repository clones successfully
- [ ] Frontend installs successfully
- [ ] Frontend dev server starts
- [ ] Backend installs successfully
- [ ] Backend dev server starts
- [ ] Frontend receives backend mock telemetry
- [ ] ESP-IDF is installed
- [ ] ESP32-S3 target builds
- [ ] Firmware can flash to the selected ESP32-S3 board

## Commit Style

Use clear conventional commit messages:

```text
docs: update architecture
feat: add dashboard shell
feat: add mock telemetry server
firmware: add esp32-s3 project skeleton
fix: correct tank calibration display
```
