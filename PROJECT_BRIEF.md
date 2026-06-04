# Project Brief

## Project Name

DIY RV PRO

## Objective

Build a universal RV automation, monitoring, and control platform using an ESP32-S3 controller, a polished web dashboard, and a matching 7-inch touchscreen HMI.

The product must support real RV subsystem monitoring and control while remaining configurable enough for different coaches, generators, HVAC systems, tanks, battery banks, and solar configurations.

## Product Goal

Create a commercial-grade RV control system that can support:

- A convincing presale and development demo
- Real firmware deployment on ESP32-S3 hardware
- Touchscreen HMI use inside the RV
- Later mobile application support
- Installer-friendly setup and service documentation
- Field diagnostics and future OTA update support

## UI Target

The uploaded dashboard screenshot is the visual benchmark. The project should replicate that level of polish or exceed it.

Key visual targets:

- Dark premium dashboard
- Left navigation rail
- Top controller status bar
- Dense system cards
- Power history chart
- HVAC cards
- Generator card
- Tank gauges
- Recent event list
- Automation status panel
- Realistic populated demo data

## Core System Coverage

### Power System

- Shore power status
- Inverter status
- Battery voltage, current, state, and temperature
- Solar voltage, current, watts, and daily energy
- Load watts and total energy
- Configurable battery chemistry and bank size

### Generator System

- Diesel, gasoline, propane, and dual-fuel configurations
- Runtime tracking
- Fuel type
- Start method
- Auto-start enable status
- Feedback from run signal, RPM, voltage, current, power, or temperature depending on installation

### Climate System

- Two interior climate zones
- Two air conditioners
- Two furnaces
- Heat pump capable modes
- Furnace-only or AC-only configurations
- Four programmable schedule blocks
- Temperature sensor mapping

### Tanks and Plumbing

- Fresh tank
- Grey tank
- Black tank
- LP tank
- Configurable capacities
- Water pump control
- Water heater control
- Tank calibration

### Automation

Automation must be user-defined. The system should provide a rule builder with triggers, conditions, actions, delays, interlocks, notifications, and safety limits.

## Firmware Target

Primary firmware platform:

- ESP32-S3
- ESP-IDF
- FreeRTOS task model
- NVS configuration storage
- Local API and telemetry publishing

## Success Criteria

- Web UI runs locally and looks like a finished product demo
- Backend supplies realistic simulated data while hardware is not connected
- Firmware skeleton builds for ESP32-S3
- Architecture supports future real sensors and outputs
- Documentation is detailed enough for coding agents and developers to continue without re-planning
