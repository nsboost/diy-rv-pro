# Automation, notifications and configuration completion audit

Audited October 10, 2026; refreshed against code revision `d70fffc`. This is an open
acceptance checklist, not a completion claim. Local baseline: 91 frontend
regressions and production build passed; 27 firmware host tests and ESP32-S3
build passed. Physical-controller behavior remains unverified.

October 10 follow-up: 103 frontend tests and the production build pass.
The browser permission flow was exercised in the local demo: an unanswered
permission request releases the disabled control after 30 seconds, retains
browser delivery as off and displays retry guidance. Late permission completion
does not silently save an enabled preference. Actual OS delivery still requires
a granted permission and remains unverified. Mobile navigation backdrop dismissal
was also verified after correcting the misplaced pending-dialog guard.

Configuration drafts now register a browser unload guard only while dirty. In the
embedded browser, a reload attempt retained the unsaved draft; after explicit
discard, a clean reload completed normally. The embedded browser did not expose
a visible confirmation dialog, so that prompt appearance remains unverified.
The production build passed after this change.

Recovery follow-up: the backup firmware build passed (996,481 bytes flash,
77,872 bytes static RAM). Saved-record loading now checks the complete binary
record boundary, rejecting embedded null terminators and hidden suffix bytes.
All 29 firmware host tests pass, including that regression; the updated ESP32-S3
build also passed (996,705 bytes flash, 77,872 bytes static RAM). Physical fault and
recovery tests remain outstanding.

| Requirement | Current evidence | Remaining acceptance work |
| --- | --- | --- |
| GPIO inventory and addressed zone selection | Validator, inventory editor, address-specific mappings and host regressions; two-zone populated demo | Verify physical bus wiring, selected ROM addresses and independent zones on ESP32 |
| Configuration menus and backup/import | Browser export/import and draft-navigation checks; strict raw validation and save feedback | Commission supported interfaces, verify delayed/failed device saves, reload and upgrade migration |
| User-defined automation | Editor/catalog, portable evaluator, hold/restore/interlock tests and persistent rule store | Complete real equipment sources/actions and verify device editing, scheduling and faults |
| In-app/browser notifications only | Preferences, acknowledgement handling, browser permission UI and demo alert workflow | Verify permitted OS delivery, controller alert acknowledgement under network/storage failure and reboot behavior |
| Dashboard feedback | Explicit demo/device distinction, stale/fault mapping, command acceptance versus confirmation and storage errors | Verify live controller faults, offline behavior, multiple clients and actual equipment feedback |
| GitHub reconciliation | Changes pushed to main; working tree clean at audit; frontend CI passed | Matching firmware and Windows host jobs must complete successfully; no full CI success claim yet |

## Remaining implementation and verification

- [ ] Verify physical reboot and interrupted-write behavior for successful alert
  activation and its notification in one NVS state transaction. Version-2 runtime storage now saves activation with notifications and restores
  it at startup; host tests cover validation and fresh-engine behavior. Physical
  NVS transactions and interrupted-write behavior still need verification. A steady condition
  must not send another alert solely because the controller restarts. Restore
  actions, rule edits/deletion, old-state migration and failed writes need tests.
- [ ] Verify on-device that hold/retry timers start fresh after reboot. The
  activation-only restore helpers exclude timers and previous samples, with host
  regression coverage; saved uptime is not reused as a new boot clock. Verify source-unavailable boot,
  later recovery and restored conditions before declaring reboot behavior done.
- [ ] Integrate physical power, tank and generator sources with explicit freshness
  and fault states. `source_values` currently supplies addressed temperatures,
  local contacts and synchronized local time; the demo has a broader source set.
- [ ] Implement commissioned output drivers and equipment state machines.
  `execute` currently handles notifications and rejects equipment actions with
  an uncommissioned-driver warning. GPIO/relay fields alone do not enable real
  HVAC, generator or water control. Exact interface/board mappings are needed.
- [ ] Provide a supported recovery workflow for retained unreadable NVS automation
  state. Firmware now provides an authenticated raw-record backup endpoint and
  Settings download menu, preserving corrupt bytes without writes. Client byte
  preservation and invalid-response tests pass; disconnected menu behavior was
  checked in the production browser. Repair/import and on-device NVS export/fault
  verification remain incomplete. Verify storage failures without erasing originals.
  The portable recovery preparation helper now validates version-1/2 records,
  creates a version-2 copy with every rule disabled and activation cleared, and
  retains alert history without modifying the source. Host tests cover migration,
  active-rule clearing and each allocation failure with zero leaked allocations.
  All 30 firmware host tests and the ESP32-S3 build pass. This helper is now
  connected to the authenticated repair endpoint, which commits and verifies a
  separate original copy before replacing the working record. Original download
  and restart-pending feedback are implemented. Settings now supports recovery file
  review/discard, explicit backup acknowledgement and authenticated disabled-rule
  save, with controls unavailable while disconnected or without a storage fault.
  Browser review/discard passed with one rule and one alert, and no console errors.
  All 110 frontend tests and the production build pass. The recovery write sequence
  is now shared with a portable storage adapter and covered by injected read/write/
  commit failures, allocation failures, byte-verification mismatch, original size
  changes, occupied/full backup slots and exact corrupt-binary preservation. All
  34 firmware host tests pass. These are adapter-level tests; ESP-IDF NVS behavior
  and physical interrupted-write testing remain incomplete; no
  recovery-completion claim.
  Startup no longer automatically erases the whole NVS partition on no-free-pages
  or version errors. Failed initialization retains the partition and stops startup
  with a diagnostic; readable-record API recovery and partition-level maintenance
  are distinct paths. Initialization-failure and power-loss bench checks remain open.
- [ ] Exercise pending save/delete/acknowledgement and keyboard/backdrop dismissal
  with delayed live requests.
  Production-browser save and delete have now been exercised through a local
  loopback fixture that delays control responses by eight seconds. During each
  pending request, the editor stayed open after Escape, its fields and Cancel
  were disabled, and save/close controls were disabled as applicable. After server
  confirmation, the dialog closed and the saved/deleted rule and matching event
  were visible. No captured console errors occurred during the save. This is
  simulated HTTP evidence, not ESP32 evidence. Acknowledgement, HVAC saves,
  backdrop dismissal and failure-path UI checks remain open. The fixture tab and
  server were closed; the standalone demo inventory was unchanged.
  A shared command guard now rejects overlapping dashboard, HVAC, automation and
  device acknowledgement requests without sending or queuing the second action.
  Regression tests cover deferred confirmation, no replay, and guard release after
  asynchronous and synchronous failures. All 112 frontend tests and the production
  build pass. Delayed on-device UI verification remains open.
  Background telemetry/configuration refreshes now discard results and errors
  when a command or configuration save crosses their request lifetime, preventing
  old readings, inventory or failures from overwriting newer confirmation. Profile
  saves share the command guard. Deferred-operation regression coverage passes;
  all 113 frontend tests and the production build pass. The live demo rendered
  normally after reload with no captured console errors; the initial development
  hot reload had shown an empty background. The race still needs delayed device
  request verification.
  Idle browser flows passed; pending behavior is
  currently implementation-inspected and request-helper tested. Dialog fields now
  use a disabled fieldset during pending HVAC/automation operations so users cannot
  edit a different draft while its earlier version is being saved. Idle browser
  editing/cancel and dialog layout were checked after this change; delayed device
  request behavior remains unverified. All 110 frontend tests and build passed.
- [ ] Verify notification permission granted/denied/unavailable states and actual
  OS delivery while the dashboard is open. Closed-browser background delivery
  is outside the chosen in-app/browser implementation and is not promised.
- [ ] Finish commissioning and protocol-capability selection so menu choices match
  actual supported hardware. Verify configuration saves, restart requirements,
  discovery and manual overrides on the installed target.
  Automation status and the rule editor now explicitly explain current controller
  limitations: temperature/contact/time alerts are implemented; equipment drivers
  and physical power/tank/generator sources require commissioning. Demo wording
  makes its simulated sources/actions explicit. Both notices were verified in the
  live browser, and the editor was closed without saving. Production build passed.
  This disclosure does not replace capability selection or physical integration.
- [ ] Inspect complete CI for the final code revision, then reconcile release
  artifacts and documentation. A successful frontend job is only one gate.

See [Delivery Status](DELIVERY_STATUS.md) for the larger installed-system release
and [User Manual](USER_MANUAL.md) for current user workflows.

Physical test procedure: [Automation reboot bench](AUTOMATION_REBOOT_BENCH.md).
