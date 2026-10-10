# Decisions

## 1. Controller Platform

Decision: use ESP32-S3 as the primary controller platform.

Reasoning:

- More capable than the earlier ESP32-C3 direction
- Better fit for a premium RV controller product
- Strong ESP-IDF support
- Adequate processing margin for telemetry, networking, and UI-related services
- Better future expansion path

Status: accepted.

## 2. Firmware Framework

Decision: use ESP-IDF instead of Arduino as the primary firmware framework.

Reasoning:

- Production-grade ESP32 support
- Native FreeRTOS control
- Better partition and OTA support
- Better NVS and networking support
- Cleaner long-term firmware architecture

Status: accepted.

## 3. UI Benchmark

Decision: use the uploaded DIY RV PRO dashboard screenshot as the visual benchmark.

Reasoning:

- It captures the target product feel
- It includes the intended navigation model
- It shows the desired density of live telemetry
- It demonstrates the expected dark premium dashboard style
- It includes the major system areas required for the final product

Status: accepted.

## 4. Frontend Stack

Decision: use a React and Vite frontend.

Reasoning:

- Fast development loop
- Strong component model
- Good fit for dashboard cards, charts, and settings pages
- Easy to deploy as web demo
- Can be adapted for HMI display layouts

Status: accepted.

## 5. Backend Demo Bridge

Decision: create a backend demo bridge before full hardware integration.

Reasoning:

- The UI needs realistic data now
- Presale and development demos cannot wait for every sensor and output to be wired
- The same API shape can later be implemented by the ESP32-S3 hardware
- Allows frontend, automation, and setup wizard development in parallel with firmware

Status: accepted.

## 6. API Style

Decision: use REST for initial state and WebSocket for live telemetry updates.

Reasoning:

- REST is simple for configuration and current-state fetches
- WebSocket is better for dashboard telemetry
- This maps well to both backend demo mode and hardware mode

Status: accepted.

## 7. Automation Principle

Decision: automation must be user-defined and user-controlled.

Reasoning:

- RV systems have safety and comfort implications
- Installations vary widely
- The controller should not make major decisions without configured rules
- Templates are acceptable, but user approval and configuration are required

Status: accepted.

## 8. Universal RV Configuration

Decision: model RV systems as configurable profiles rather than fixed assumptions.

Reasoning:

- RVs vary by manufacturer, year, layout, generator, HVAC, tanks, battery, and solar equipment
- A commercial product must adapt to many installations
- Setup wizard and hardware profiles are required

Status: accepted.

## 9. Generator Support

Decision: support generator configuration by type, start method, and available feedback signals.

Supported categories:

- Diesel
- Gasoline
- Propane
- Dual-fuel

Supported start and feedback concepts:

- Two-wire start
- Momentary start/stop
- Run-state feedback
- RPM feedback
- AC voltage feedback
- Current or power feedback
- Temperature feedback

Status: accepted.

## 10. HMI and Web UI Parity

Decision: the 7-inch HMI should share the same design language and data model as the web UI.

Reasoning:

- Reduces duplicate design work
- Keeps the product consistent
- Makes demo and installed product feel like the same system
- Improves maintainability

Status: accepted.

## 11. Safety and Fault Handling

Decision: firmware must be designed with safe-state behavior.

Reasoning:

- RV electrical and mechanical systems can be damaged by incorrect control behavior
- Outputs need predictable startup, shutdown, and fault behavior
- Faults must be visible to the UI and event log

Status: accepted.
