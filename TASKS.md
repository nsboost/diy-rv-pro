# Tasks

## Current Priority

Build DIY RV PRO into a polished, runnable RV controller demo and ESP32-S3 firmware foundation.

## Phase 1: Repository Foundation

- [ ] Confirm final repository structure
- [ ] Add frontend, backend, firmware, hardware, assets, automation, docs, scripts, and tests folders
- [ ] Add root package scripts where useful
- [ ] Add GitHub Actions for frontend and firmware validation
- [ ] Add issue templates for firmware, UI, hardware, and documentation work

## Phase 2: Polished Web Dashboard

- [ ] Build dashboard layout matching the uploaded UI benchmark
- [ ] Add left navigation rail
- [ ] Add top controller status bar
- [ ] Add battery, solar, loads, shore power, inverter, and weather cards
- [ ] Add power history time-series chart
- [ ] Add generator status card
- [ ] Add HVAC zone cards
- [ ] Add tank gauge panel
- [ ] Add recent event list
- [ ] Add automation status panel
- [ ] Populate all pages with realistic demo data
- [ ] Make layout responsive for desktop, tablet, and 7-inch HMI screens

## Phase 3: Application Pages

- [ ] Dashboard page
- [ ] Climate page
- [ ] Power page
- [ ] Tanks page
- [ ] Generator page
- [ ] Automation page
- [ ] History page
- [ ] Settings page
- [ ] Setup Wizard page

## Phase 4: Backend Demo Bridge

- [ ] Create Node.js backend service
- [ ] Add REST endpoint for current system state
- [ ] Add WebSocket endpoint for live telemetry
- [ ] Add mock telemetry generator
- [ ] Add persistent demo configuration
- [ ] Add event log generator
- [ ] Add automation rule mock engine

## Phase 5: ESP32-S3 Firmware Foundation

- [ ] Initialize ESP-IDF firmware project for ESP32-S3
- [ ] Add board configuration file
- [ ] Add GPIO abstraction
- [ ] Add ADC abstraction
- [ ] Add relay output abstraction
- [ ] Add digital input abstraction
- [ ] Add sensor registry
- [ ] Add NVS configuration storage
- [ ] Add Wi-Fi provisioning plan
- [ ] Add telemetry model
- [ ] Add watchdog configuration
- [ ] Add OTA partition plan

## Phase 6: RV Subsystem Models

- [ ] Battery model
- [ ] Solar model
- [ ] Load model
- [ ] Shore power model
- [ ] Inverter model
- [ ] Generator model
- [ ] HVAC model
- [ ] Furnace model
- [ ] Air conditioner model
- [ ] Tank model
- [ ] Water pump model
- [ ] Water heater model
- [ ] Temperature sensor model
- [ ] Alert model

## Phase 7: Automation Engine

- [ ] Define rule schema
- [ ] Define trigger types
- [ ] Define condition types
- [ ] Define action types
- [ ] Define interlock behavior
- [ ] Define quiet-hours behavior
- [ ] Define notification behavior
- [ ] Build frontend rule builder
- [ ] Build backend mock evaluator
- [ ] Prepare firmware evaluator architecture

## Phase 8: Setup Wizard

- [ ] Add coach profile setup
- [ ] Add battery setup
- [ ] Add solar setup
- [ ] Add generator setup
- [ ] Add HVAC setup
- [ ] Add tank setup
- [ ] Add water system setup
- [ ] Add sensor assignment setup
- [ ] Add output assignment setup
- [ ] Add automation starter templates

## Phase 9: Documentation

- [ ] Wiring documentation
- [ ] Pinout documentation
- [ ] BOM
- [ ] Installation manual
- [ ] Firmware flashing guide
- [ ] OTA update guide
- [ ] HMI deployment guide
- [ ] Troubleshooting guide

## Phase 10: Validation

- [ ] Frontend visual review against uploaded UI benchmark
- [ ] Backend telemetry validation
- [ ] Firmware compile validation
- [ ] Long-runtime mock test
- [ ] Configuration persistence test
- [ ] Automation rules test
- [ ] Setup wizard completion test
