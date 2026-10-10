# DIY RV PRO status — October 9, 2026

This document records the initial review. The implementation update below supersedes the initial counts and fixed gaps.

## Overall state

The active working directory is `C:\Users\Remote\Documents\New project`.
The project has a runnable React dashboard and a compiling ESP32-S3 firmware
foundation. It is a software demonstration, not a commissioned RV controller.
Most telemetry and equipment controls remain simulated.

## Folder review

| Folder | Current contents and state |
| --- | --- |
| `frontend/` | React/Vite dashboard, nine navigation destinations, HVAC controls, generator controls, charts, event views, automation editor, broad equipment configurator, API client, 14 tests, PWA assets. |
| `firmware/esp32-s3/` | ESP-IDF project, Wi-Fi, HTTP/WebSocket endpoints, static web hosting, NVS configuration, token authentication, configuration validation, mock equipment state, optional GPIO contact sampling/debounce. Includes downloaded dependencies and generated build artifacts. |
| `docs/` | API reference, delivery checklist, capacity/security review, installation and user manuals, candidate BOM, contact-input bench wiring notes. Engineering documents still require hardware-specific completion and verification. |
| `scripts/` | Windows PlatformIO build wrapper and firmware C host-test runner. |
| `.github/` | Local CI workflow for frontend, firmware build, and Windows host tests; not yet committed. |
| `.vscode/` | Editor and MCP configuration files. |
| `.git/` | Git history; branch `main` is seven commits behind fetched `origin/main`, with substantial local modified, deleted, and untracked files. |

The separate `C:\Users\Remote\Documents\diy-rv-pro-main` directory is an older
source copy: it still contains ESP32-C3 firmware and lacks the current docs,
scripts, configuration modules, and tests. It should not be used as the current
release baseline. The supplied visualization directory contains no files.

There are no current standalone `backend/`, `hardware/`, `automation/`, or root
`assets/` implementation folders. The demo simulation lives in the frontend;
the device API lives in firmware. Some older React component files remain while
the active App implements much of the current dashboard itself.

## Verified in this review

- Frontend tests: 14 passed, zero failures.
- Frontend production build: passed; approximately 607 KB JavaScript and 24 KB CSS. The JavaScript bundle triggered a size warning.
- Firmware C host tests: 9 passed, zero failures.
- ESP32-S3 firmware build: passed; linker usage 69,248 bytes RAM (21.1%) and 902,985 bytes application flash (34.4%). These figures do not measure runtime memory headroom.
- Browser: dashboard rendered; generator start changed to Running and stop restored Stopped; simulation events appeared. Setup configurator opened with all equipment groups initially empty.
- Demo server: running at `http://127.0.0.1:5173/`, bound to loopback.

Browser review was a targeted smoke check, not an exhaustive test of every page,
viewport, or installed-device workflow. No board was flashed or commissioned.

## Remaining work, in priority order

1. Preserve and reconcile local implementation with the seven remote documentation commits; commit the intended files, exclude generated logs/screenshots appropriately, and verify CI on a matching revision.
2. Define exact board revisions, protected power/interface circuits, safe pin capabilities, approved devices, and physical wiring.
3. Implement real sensors and protocol drivers, calibration, fault/stale states, protected outputs, and commissioning. The contact sampler is an initial hardware path but still needs bench verification and UI integration.
4. Implement generator and HVAC state machines with feedback, timing limits, interlocks, lockouts, manual overrides, and reboot/brownout behavior.
5. Implement persistent automation execution, history/event storage, notifications, and recovery behavior. The existing rule editor and sample history do not establish those runtime capabilities.
6. Complete configuration-driven rendering, driver/capability selection, connection conflict checks, calibration, commissioning, backup/restore, and schema migration. Connect the frontend to streamed telemetry; it currently polls REST.
7. Correct installed-device command feedback: the frontend currently mutates local simulation before a remote command completes. Prevent simulated readings or success indications from obscuring a disconnected or failed real controller.
8. Complete secure pairing/encrypted transport, credential/session lifecycle, telemetry/WebSocket authorization, rate limits, audit events, signed updates, secure provisioning, and recovery. Current code does not establish government security compliance.
9. Improve demo clarity and accessibility: the overview displays seeded Online status, date, uptime, and firmware version while Settings identifies Local simulation; icon-only responsive navigation loses accessible labels. Validate desktop, phone, and 7-inch HMI layouts and reduce bundle size.
10. Finish exact BOM, terminal diagrams, actual hardware photos, installation and user workflows; verify on hardware under faults and sustained load; package firmware/web images, checksums, manuals, and release metadata.

Cameras and native streaming audio are deferred by the delivery checklist.
Camera configuration fields describe metadata, not a working streaming product.

## Demo use

Open `http://127.0.0.1:5173/` on this computer. Generator/HVAC actions affect
simulation. Configuration and rule edits in the standalone demo are memory-only
and should not be represented as durable controller saves.

To restart the development demo from the project root:

```powershell
Set-Location frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```


## Implementation update

- Named sensor inventory, DS18B20 ROM CRC validation, shared buses, GPIO conflicts,
  HVAC sensor dropdowns and authenticated physical discovery are implemented.
- Configured sensors and equipment drive the HVAC, tank, status and automation
  selectors. Unconfigured equipment no longer advertises an OK status.
- The standalone demo preserves configuration, rules, alert acknowledgment and
  successful rule activation in browser storage. In-app and browser notifications
  are the chosen delivery scope; email actions are rejected.
- Setup has dedicated fields for every inventory group, plus validation and JSON
  import/export. Installed-device commands await API confirmation and report
  errors. HVAC save failures remain visible in the dialog.
- Firmware has a portable validated rule evaluator and NVS-backed rule/alert
  runtime. Temperature-based alerts run in a background task. Physical equipment
  drivers, other source values, time synchronization and hardware bench checks
  remain incomplete; equipment prototype simulation is labeled explicitly.
- The frontend suite currently contains 31 passing tests, including malformed
  inventory imports, HH:MM clock comparisons and independent in-app/browser
  notification preferences. Firmware host tests
  contain 16 passing tests including time-zone rules, saved-state validation, zone-to-sensor mapping, clock comparisons, hold resets, recovery and
  failed-execution retries. ESP32-S3 integration build passed: 76,416 bytes static
  RAM and 960,425 bytes application flash. Runtime headroom and hardware operation
  still need bench verification.

The active goal remains open until the remaining runtime/menu gaps and GitHub
reconciliation are verified. No government security compliance or hardware
commissioning is claimed.

Controller Settings now includes connection, session-token storage, optional browser remembering, sign-out and first-boot/network configuration forms. The forms render in the browser; an actual device pairing run remains unverified.

The firmware clock comparison syntax now matches the browser (`HH:MM`). Clock
sources still require synchronization before schedules can run on the controller.
The SNTP synchronization path and generated 598-zone IANA lookup are now
implemented, with unknown time zones rejected and unsynchronized schedules
remaining unavailable. Settings displays clock readiness. The generator script
pins tzdata 2026.5 (IANA 2026e); no generator dependency is required for ordinary
firmware builds. The integration rebuild and physical clock test remain pending.
Wi-Fi station setup now attempts connection on startup and retries five seconds
after disconnects or immediate connection errors. Settings reports running station
status without exposing credentials. Access-point service stays enabled during
station retries. Physical network connection/recovery testing remains pending.

Firmware automation now resolves `hvac.<zoneId>.tempF` through the zone's assigned
temperature sensor, matching bus and ROM identity case-insensitively for hex
addresses. Host tests cover reversed discovery order, separate zone readings,
stale samples, wrong buses, disabled sensors and pending input configuration.
The integration rebuild for this source resolver passed.

The automation editor now preserves unavailable source/target identifiers visibly
in its selectors and explains removed or disabled equipment references. The live
browser check confirmed an old solar/breaker rule could not be saved until its
references were corrected. Delete failures are shown in the editor. Frontend
tests (30) and the production build pass.

Notification preferences now use validated booleans and are synchronized with
the demo engine on startup, so switching between controller and demo sessions
does not leave menu choices out of sync with delivery. Live browser verification
confirmed the in-app choice survives reload and acknowledged alerts stay read.
The updated 31-test suite and frontend production build pass.

Stored notification recovery now validates the version, bounded field types,
unique alert identities and nonnegative timestamps before publishing the state.
It preserves initialized arrays if allocation fails and requires a complete,
terminated JSON payload. Corrupt or unsupported stored states are rejected.
