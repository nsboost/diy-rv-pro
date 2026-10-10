# Automation, notifications and configuration completion audit

Audited October 10, 2026; refreshed against code revision `d70fffc`. This is an open
acceptance checklist, not a completion claim. Local baseline: 91 frontend
regressions and production build passed; 27 firmware host tests and ESP32-S3
build passed. Physical-controller behavior remains unverified.

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
  state. Current firmware preserves it and blocks writes; it does not provide an
  export/repair interface. Verify storage failures without erasing originals.
- [ ] Exercise pending save/delete/acknowledgement and keyboard/backdrop dismissal
  with delayed live requests. Idle browser flows passed; pending behavior is
  currently implementation-inspected and request-helper tested.
- [ ] Verify notification permission granted/denied/unavailable states and actual
  OS delivery while the dashboard is open. Closed-browser background delivery
  is outside the chosen in-app/browser implementation and is not promised.
- [ ] Finish commissioning and protocol-capability selection so menu choices match
  actual supported hardware. Verify configuration saves, restart requirements,
  discovery and manual overrides on the installed target.
- [ ] Inspect complete CI for the final code revision, then reconcile release
  artifacts and documentation. A successful frontend job is only one gate.

See [Delivery Status](DELIVERY_STATUS.md) for the larger installed-system release
and [User Manual](USER_MANUAL.md) for current user workflows.
