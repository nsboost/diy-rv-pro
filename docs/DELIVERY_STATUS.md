# Firmware and installation package delivery

## Objective

Deliver functional ESP32-S3 firmware, a complete installer configurator, an
installation manual with wiring diagrams and pictures, a user manual, and a
comprehensive bill of materials covering required parts, optional parts, and
supported substitutions. This checklist records completion evidence; menu
options and successful compilation alone do not establish hardware support.

Cameras and native streaming audio are deferred. Security sensors remain an
optional add-on that can be installed initially or enrolled later.

## Deliverables and acceptance evidence

| Deliverable | Required evidence | Current state |
| --- | --- | --- |
| Board profiles and protected interfaces | Exact board revisions, reserved pin map, power budget, schematics, measured input/output behavior | Missing |
| Real telemetry | Driver tests and bench readings for each supported sensor/protocol; stale/fault states | Simulated |
| HVAC | Multiple zones, equipment capabilities, feedback, compressor timing, sensor-failure response, independent zone tests | Configuration and simulation |
| Generator | Monitor-only and documented control strategies; crank/retry limits, feedback, cooldown, lockout and manual override tests | Configuration and simulation |
| Electrical | Multiple solar controllers, inverters, batteries, AC/DC circuits; model-specific protocol maps and isolation | Configuration and simulation |
| Water | Tank types/calibration, pumps, tank/tankless heaters, fuel/element options and recirculation; device-specific interlocks | Configuration and simulation |
| Temperature | HVAC, refrigerators, freezers, ambient and equipment zones; sensor identity, units, calibration, faults | Addressed DS18B20 inventory/discovery and stale/fault handling implemented; hardware bench verification pending |
| Optional security | Enrollment, contact/presence/tamper inputs, debounce, supervised wiring options, heartbeat loss, arming and events | Local GPIO contact sampler and authenticated endpoint implemented; debounce host-tested; configured contact UI and automation sources implemented; hardware/expansion pending |
| Automation | Persistent rules, bounded execution, priority/interlock checks, reboot and fault tests | Browser engine and persistence implemented; portable firmware evaluator and NVS sensor-alert runtime implemented; addressed temperature and local contact sources integrated; equipment drivers, remaining sources and reboot activation verification pending |
| Configurator | Guided inventory, supported driver selection, connection mapping, calibration, conflict checks, commissioning, backup/restore and upgrade migration | Inventory editor with GPIO/address validation and verified JSON export/import; driver commissioning and upgrade migration pending |
| Configuration-driven UI | Installed items only; actual readings, command feedback, fault/offline states; responsive browser tests | Demo-first |
| Security | Authenticated transport/enrollment, authorization, credential lifecycle, update signing/recovery and adversarial tests | Incomplete |
| Installation manual | Exact terminal diagrams, actual board photographs, protected power wiring, cable/fuse selection, equipment adapters, commissioning and troubleshooting | Engineering edition exists; terminal drawings/photos and bench verification pending |
| User manual | Verified daily workflows, alarms, overrides, security options, backup/restore, updates and recovery | Engineering edition describes current limitations; installed workflows pending |
| Bill of materials | Manufacturer/part/revision, quantity formula, electrical ratings, supplier references, required/optional status, substitution conditions and compatibility evidence | Candidate matrix exists; exact interface assemblies and compatibility tests pending |
| Release | Firmware and web images, versioned manuals/BOM, checksums, passing CI, matching local/GitHub revision | Not delivered |

## Implementation sequence

Working documents: [Installation Manual](INSTALLATION_MANUAL.md),
[User Manual](USER_MANUAL.md), [Bill of Materials](BILL_OF_MATERIALS.md).

1. Establish board/driver capability definitions and configuration validation.
2. Separate simulation from hardware telemetry; unavailable readings must never
   silently become plausible demo data on an installed controller.
3. Implement real sensor acquisition and bounded output drivers, then equipment
   state machines and automation. Keep hardware-independent logic host-testable.
4. Connect the configurator to capabilities, calibration and commissioning.
   Saving configuration and authorizing physical control are separate states.
5. Author installation and user instructions alongside each completed workflow;
   maintain a parts compatibility matrix and source references.
6. Verify physical wiring, fault handling, power interruption, multiple clients,
   expansion enrollment, upgrades and runtime resource margins on actual boards.
7. Package and reconcile the verified release with GitHub without discarding
   existing local work or the remote documentation changes.

## Documentation rules

- Photographs must show the actual referenced hardware or be clearly attributed
  manufacturer images. Illustrative images cannot establish terminal pinouts.
- Wiring diagrams must identify voltage domains, polarity, fusing, isolation,
  terminals, cable requirements and equipment-specific connections.
- A nominal voltage rating alone does not prove tolerance of RV supply transients.
- Resistive, voltage, current-loop and digital sensors are not interchangeable
  without the specified interface circuit and calibration.
- Record unsupported combinations explicitly. Never infer a protocol from a
  brand name or imply that generic relay contacts replace equipment safeguards.
- Installer guidance must distinguish low-voltage work from mains/fuel-system
  work that requires appropriate qualifications and manufacturer instructions.

## Current verified baseline

2026-09-30: ESP32-S3 firmware builds with PlatformIO Core 6.1.19,
Espressif32 7.0.1 and ESP-IDF 6.0.1. A fresh build, incremental build and SPIFFS
image generation passed. Hardware runtime, connected sensors and physical
outputs have not been verified. See CAPACITY_SECURITY_REVIEW.md for build sizes.

Host regression tests now execute the firmware C configuration code with the
same cJSON and Unity sources used by the ESP-IDF environment. The Windows test
runner is `scripts/test-firmware.ps1`; CI includes a Windows build/test job.
Coverage includes monitor-only HVAC/generators, self-controlled HVAC, missing
control relays, invalid generator strategies, fractional GPIO/relay/schema
values, preservation of saved configuration after rejection, tank profile
serialization and simulated command behavior. This is logic verification, not
hardware commissioning or validation of every sensor advertised by the editor.

Configuration identity validation now requires each equipment/sensor item to
have a nonempty ID of at most 32 characters, unique across the entire profile.
Existing unique IDs remain valid; new editor items receive random 128-bit hex
IDs independent of list position. Profiles with missing/duplicate IDs are
rejected rather than silently renumbered, because renumbering can invalidate
references. Configuration normalization copies item objects to isolate edits.

The configuration PUT handler no longer copies the approximately 24 KB profile
onto the 4 KB HTTP task stack. It allocates a checked temporary candidate on the
heap, releases it on every exit path and only updates active state after storage
reports success. Token-hash failures now abort initial setup. Compiler output
shows a 208-byte handler frame; this excludes callees and is not a runtime stack
high-water measurement. Application CMake treats stack frames over 2 KB as build
errors. Power-loss atomicity across NVS keys and heap exhaustion under load still
require further work and verification.
