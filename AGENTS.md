# Agents

## Purpose

This document defines the work lanes for AI coding agents and human developers contributing to DIY RV PRO.

The goal is to let multiple agents work without losing the product direction, hardware target, or UI benchmark.

## Global Instructions

All agents must assume:

- Hardware target is ESP32-S3
- Firmware framework is ESP-IDF
- Frontend target is the uploaded dark DIY RV PRO dashboard screenshot or better
- UI must look like a real product, not a wireframe
- Demo data must be realistic and populated
- System must support variable RV configurations
- Automation must be user-defined
- Documentation must stay synchronized with implementation

## Frontend Agent

Responsibilities:

- Build the React/Vite dashboard
- Match or exceed the uploaded UI benchmark
- Implement all major pages
- Build reusable card components
- Add charts and time-series visualizations
- Connect to backend REST and WebSocket APIs
- Maintain responsive layouts for desktop and 7-inch HMI screens

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

Quality bar:

- No empty pages
- No placeholder-only layouts
- No generic starter-app look
- Every card should contain realistic data
- Navigation must feel finished

## Backend Agent

Responsibilities:

- Build the Node.js demo bridge
- Provide REST endpoints for current state and settings
- Provide WebSocket telemetry stream
- Generate realistic mock data
- Store demo configuration
- Simulate event logs
- Simulate automation rule status

API domains:

- system
- power
- generator
- climate
- tanks
- water
- temperatures
- automation
- events
- settings

The backend API should mirror the future hardware API as closely as possible.

## Firmware Agent

Responsibilities:

- Build ESP-IDF project for ESP32-S3
- Define firmware structure
- Add FreeRTOS task model
- Add board configuration
- Add NVS storage
- Add telemetry model
- Add sensor and output abstractions
- Prepare OTA partition plan

Firmware must avoid hard-coding RV-specific assumptions into low-level drivers. Board mapping and coach configuration should drive behavior.

## Hardware Agent

Responsibilities:

- Define wiring assumptions
- Define ESP32-S3 pinout plan
- Document IO requirements
- Document relay, sensor, and power monitor interfaces
- Maintain hardware notes under `hardware/` and `docs/`

Hardware planning must account for:

- Noisy RV electrical environments
- 12 V systems
- Generator feedback
- Shore power sensing
- Tank sensors
- Temperature sensors
- Relay outputs
- Future expansion

## Automation Agent

Responsibilities:

- Define automation rule schema
- Create examples
- Support trigger, condition, action, delay, interlock, notification, and quiet-hours concepts
- Keep automation user-defined and transparent
- Coordinate frontend builder, backend mock evaluator, and firmware evaluator design

Example rules:

- Low battery generator start
- High grey tank alert
- HVAC zone schedule
- Temperature threshold alert
- Power source transition notification

## Documentation Agent

Responsibilities:

- Keep README and planning docs accurate
- Add wiring documentation
- Add BOM documentation
- Add setup and installation docs
- Add firmware flashing docs
- Add HMI deployment docs
- Add troubleshooting docs

Documentation must stay practical and implementation-oriented.

## QA Agent

Responsibilities:

- Validate frontend against uploaded UI benchmark
- Confirm all pages are populated
- Confirm backend mock telemetry works
- Confirm firmware builds for ESP32-S3
- Confirm setup wizard flow works
- Confirm automation rules can be enabled and disabled
- Confirm no stale ESP32-C3 references remain unless explicitly discussing project history

## DevOps Agent

Responsibilities:

- Add GitHub Actions
- Add build checks
- Add lint checks
- Add firmware compile checks where possible
- Add release packaging later

## Anti-Patterns to Avoid

- Building a plain starter template
- Leaving pages empty
- Reverting hardware target to ESP32-C3
- Hard-coding one RV layout
- Treating generator support as one fixed model
- Treating HVAC as a single thermostat only
- Skipping realistic demo telemetry
- Creating documentation that does not match the repository
