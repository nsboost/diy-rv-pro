# DIY RV PRO status — October 9, 2026

This document records the initial review. The implementation update below supersedes the initial counts and fixed gaps.

## Latest verified state - October 10, 2026

- Local frontend: 76 tests pass; production build passes. Bundle size warning remains.
- Local firmware: 23 host tests pass; ESP32-S3 build passes at a7cb450.
  Static RAM is 77,872 bytes; application flash is 993,657 bytes.
- GitHub CI run [38046143804](https://github.com/nsboost/diy-rv-pro/actions/runs/38046143804)
  for a7cb450: frontend succeeded; firmware and Windows host tests were still running at inspection.
- Addressed temperatures and contact sources are connected to automation logic.
  Contact comparisons now agree between editor validation and firmware execution.
- Hardware equipment actions still lack commissioned output drivers. HVAC/generator
  state machines, other physical source drivers, reboot activation persistence,
  and full live-controller browser/fault verification remain incomplete.
- Notification delivery is in-app and browser only; browser delivery requires
  permission and an open dashboard. No background push service is implemented.
- The folder review below is the historical October 9 snapshot, not current Git state.

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
- The frontend suite currently contains 76 passing tests, including malformed
  inventory imports, HH:MM clock comparisons and independent in-app/browser
  notification preferences. Firmware host tests
  contain 23 passing tests including generator stop assignments, assigned pump outputs, boolean flag validation, rule identity retention, disabled circuit configuration, time-zone rules, saved-state validation, zone-to-sensor mapping, clock comparisons, hold resets, recovery and
  failed-execution retries. ESP32-S3 integration build passed: 77,872 bytes static
  RAM and 992,961 bytes application flash. Runtime headroom and hardware operation
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
firmware builds. The integration rebuild passed; the physical clock test remains pending.
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

The demo evaluator now validates every action against the current configured
equipment and supported commands immediately before execution. A saved rule
cannot continue operating a generator switched to monitor-only; it reports the
unavailable target and retains pending activation. The 32-test frontend suite
and production build pass with this regression covered.

Setup validates controller-compatible integer bounds for generator timing, tank
calibration/capacity, power capacity, temperature alarms and security delays.
Unsupported HVAC modes and unassigned controller-managed water-heater outputs
are rejected before save. Disabled circuits may keep an unassigned output in
both frontend and firmware; enabling a controllable circuit requires its relay.
Frontend tests (33), firmware host tests (17), and the frontend build pass.

Automation cards now display evaluator state independently of the enabled
switch: watching, holding, triggered, unavailable input or pending action retry.
Firmware telemetry includes per-rule runtime state. The live browser shows the
sensor alert as triggered and unconfigured battery/solar sources waiting for
valid input. The frontend suite (34) and firmware host suite (17) pass.

Temperature bus GPIO conflict checks now include enabled analog inputs in
frontend and firmware. Setup labels the existing `adcChannel` field as ADC GPIO
so users enter the physical pin rather than a peripheral channel index. Disabled
equipment does not reserve the pin. The 35-test frontend suite and 17 firmware
host tests cover the overlap and disabled-equipment exception.

Firmware evaluator state follows stable rule identities rather than list indexes.
Editing, enabling, disabling or deleting a rule resets that rule without clearing
unrelated successful activations. Host regression tests verify reordering,
individual reset and deletion do not repeat unrelated alerts (18 tests pass).

Standalone demo Settings can load a sample RV inventory and restore the previous
inventory from a browser backup. Rules and alert history are retained; loading
again preserves the original backup. The controls are unavailable on controller
sessions. Newly added demo equipment restores its simulated metrics and history
instead of remaining empty after prior removal. Live browser checks verified
load/restore and the populated dashboard; 36 frontend tests and its build pass.

Demo climate projection now clears outputs no longer assigned to a relay and
auto-control state when a zone becomes monitor-only. Physical telemetry is
preserved; this configuration cleanup does not claim a hardware switch occurred.
The regression is covered in the 37-test frontend suite and the build passes.

Water-heater automation targets now identify each assigned AC/DC element,
propane output or recirculation pump separately. Unassigned channels and
monitor-only heaters are omitted. Old generic heater targets need explicit
selection of a channel; no heating channel is guessed. A simulation regression
verifies selecting AC heat leaves propane and recirculation untouched. The 39
frontend tests and production build pass; physical heater drivers remain pending.

Stored notification recovery now validates the version, bounded field types,
unique alert identities and nonnegative timestamps before publishing the state.
It preserves initialized arrays if allocation fails and requires a complete,
terminated JSON payload. Corrupt or unsupported stored states are rejected.

Configuration text limits now use UTF-8 byte lengths, matching firmware storage: RV names and equipment labels allow 48 bytes; inventory identities allow 32 bytes. Boundary tests cover accented text that previously passed setup but exceeded controller limits. All 40 frontend tests and the production build pass. Physical equipment drivers and commissioning remain pending.

Optional inventory text fields now receive type and UTF-8 storage-bound validation before sensor processing, including bus/sensor references, protocols, gateway names and camera URLs. Imported null, numeric, object and oversized text values are rejected with field-specific errors. All 41 frontend tests and the production build pass.

Inventory control and security flags now require JSON booleans in both setup and firmware. Strings such as 'false', numbers and null are rejected instead of being interpreted inconsistently. Firmware tests confirm rejected flags preserve the saved profile. All 42 frontend tests, 19 firmware host tests, frontend production build and ESP32-S3 integration build pass. No physical board has been commissioned.

Generic relay automation actions now require a concrete assigned relay. Setup and firmware reject enabled controller-managed pumps/custom I/O and relay-managed power devices without an output. Existing rule targets become unavailable when their relay assignment is removed, through the existing current-catalog runtime check. All 43 frontend tests, 20 firmware host tests and both builds pass. Protocol-controlled equipment requires a separate implemented capability rather than an unassigned generic relay action.

Clearing a numeric setup field now preserves an empty value instead of converting it to zero. Browser verification cleared AC Circuit 1 relay 3: the field remained empty and setup displayed invalid relay channel; restoring 3 removed the issue. This prevents accidental selection of relay/GPIO zero. RV length now rejects empty, nonnumeric and out-of-range values. Existing 43 frontend tests and the production build pass.

Automation readiness now checks the current configured source/action catalog before displaying Watching trigger. Missing trigger sources, actions, restore sources and restore actions show Needs configuration immediately. Runtime action errors retain priority, and disabled rules remain visibly disabled. Browser verification confirmed the orphaned AC Breaker 2 rule displays action unavailable on both dashboard and Automation page. All 44 frontend tests and the production build pass.

Setup and firmware reject ambiguous inventory identities (path separators, whitespace and reserved object keys) before saving. Generated identities already meet these requirements. Friendly labels retain UTF-8 support. Existing imported IDs are not silently rewritten because references must be corrected together. All 45 frontend tests, 20 firmware tests and both builds pass.

The Notifications menu now displays browser delivery readiness separately from the saved preference: off, blocked, unavailable, waiting for permission or enabled while open. Permission requests disable the browser toggle until completion, preventing overlapping prompts. Browser verification confirmed the off status with in-app notifications enabled and existing acknowledgements intact; no OS permission was granted or changed. Production build passes. Permission-dialog outcomes require browser permission testing on the deployment browser.

Browser-demo notification acknowledgement now requires persistence success. A failed storage write rolls back the read flag, preserves the previous saved payload and exposes a retryable error in the Notifications menu. Missing notification IDs are rejected. A quota-failure integration test verifies unread rollback, successful retry and acknowledged state after reload. All 46 frontend tests and the production build pass.

Browser-demo configuration and automation edits now commit only when storage succeeds. Failed writes restore the previous configuration/telemetry or rules/runtime activation and reject the operation so menus display a save error. The integration test covers configuration save, enable/disable, deletion and upsert failures, preserves active alert state without duplicate delivery after recovery, and confirms successful retries survive reload. All 47 frontend tests and the production build pass.

The demo control API now executes notification.acknowledge through the same persistence-checked path as the menu, returning updated unread counts instead of a successful no-op. Missing IDs reject consistently. Rule enable commands require actual booleans; a string 'false' cannot enable a rule. Tests verify isolated acknowledgement, unread counts, no mutation of the input snapshot, save-failure rollback and retry through dispatch. All 48 frontend tests and the production build pass.

Corrupt saved-demo recovery no longer overwrites the original during automatic ticks or preference changes. Invalid JSON, unsupported versions, malformed rule/notification lists and duplicate rule IDs suspend loaded rules and report recovery. Saving a corrected configuration first copies the exact original into a unique recovery backup; backup failure prevents replacement. A recovery download button exposes preserved data from the dashboard. Integration tests cover automatic-save preservation, backup failure, successful recovery and reload. All 49 frontend tests and the production build pass; the conditional download UI is build-verified, not yet browser fault-injection tested.

Demo time-zone configuration now survives reload rather than resetting to Denver, and invalid zones are rejected before they can break scheduled evaluation. A New York winter-time test confirms the expected local scheduling minute. Recovery download references are published only after backup success, persisted across reload and restricted to dedicated recovery keys. Tests verify failed backups expose no nonexistent download reference and successful backup references survive reload. All 50 frontend tests and the production build pass.

Automation save and reload now reject nonboolean enable/restore flags, ambiguous rule identities and text exceeding firmware UTF-8 bounds. Alert commands must use the notification target. Firmware enforces the same safe identity alphabet and rejects reserved object keys. Generated fallback rule IDs use random UUIDs rather than timestamp collisions. All 51 frontend tests, 20 firmware tests and both builds pass.

Manual HVAC mode changes and Auto now check configured output interlocks rather than bypassing block rules through mode commands. Off clears simulated cooling, heating, fan and Auto states; setMode synchronizes the Auto flag. Integration tests start from Off, confirm blocked Cool/Auto commands reject, disable the block, start cooling and confirm Off clears it. All 52 frontend tests and the production build pass. This is demo logic; physical thermostat/equipment state machines still require implementation and commissioning.

Setup now checks enabled power-device communications/sensor inputs, tank sensor types, camera URLs and security input strategies before device submission. Missing generator and controllable-circuit relay fields cannot bypass required assignments through undefined comparisons. Disabled inventory may retain incomplete assignments. An import regression test covers omitted relay fields and missing input strategies, then confirms disabling those items permits retention. All 53 frontend tests and the production build pass. Selecting a protocol still does not establish an implemented physical driver.

Saved demo alerts now require unique bounded identities, bounded text, valid severity/read fields and finite supported timestamps. Duplicate or malformed entries enter the existing preserved-data recovery flow rather than loading an ambiguous inbox. Regression tests confirm invalid alerts cannot be acknowledged, automatic ticks preserve the original payload and no corrupt alert appears as a normal inbox item. All 54 frontend tests and the production build pass.

October 10 CI check: GitHub runs for 6d62477, b4c2d40, ff8da74 and 09499ab completed successfully. For f3bd035, frontend passed while firmware and Windows firmware-host jobs were still in progress at observation. This does not establish terminal CI success for the newest revision.

Firmware configuration now requires separate stop relays for enabled three-wire and momentary-start-stop generator strategies, matching setup validation. A host test rejects both incomplete strategies and accepts an assigned stop output. All 21 firmware host tests and the ESP32-S3 integration build pass. Generator physical control/state-machine commissioning remains unfinished.

Firmware tank configuration now requires positive capacity and distinct explicit empty/full calibration for enabled tanks, matching setup and rejecting direct API submissions that bypassed those requirements. Disabled tanks can retain incomplete calibration. Host regression checks reject identical readings and zero capacity and accept disabled retention. All 21 firmware tests and the ESP32-S3 integration build pass; physical tank acquisition remains pending.

The changes comparison no longer requires a dummy threshold when saving trigger or restore conditions. The editor disables the unused threshold field and explains that no threshold is needed. Normalization preserves scalar zero/false condition and action values rather than converting them to empty text. An evaluator regression verifies a threshold-free changes rule saves and reacts to a reading change. All 55 frontend tests and the production build pass; the conditional editor hint is build-verified.

Numeric automation ranges now reject missing endpoints rather than interpreting empty text as zero. Between/outside comparisons require a numeric source reading; text and boolean readings cannot activate an outside-range action. Regression tests cover empty, reversed/equal endpoints, invalid reading types and explicit zero boundaries. All 56 frontend tests and the production build pass.

HVAC mode choices now derive from assigned outputs: cooling, heating, dedicated fan and automatic climate capability. Unsupported saved modes are labeled unavailable and cannot be submitted without selecting a supported mode. The card hides Auto for zones with no heating/cooling output. Demo mode commands reject absent capabilities; integration coverage rejects Heat/Fan on the cooling-only living-room zone. All 56 frontend tests and the production build pass. Conditional dialog/card rendering is build-verified; physical thermostat control remains pending.

Simulated HVAC projection now clears unsupported operating modes after equipment assignments change. A cooling zone converted to fan-only resets to Off, clears simulated outputs and removes Auto. The regression also confirms hardware-mode telemetry preserves the reported state rather than hiding actual device readings. All 56 frontend tests and the production build pass.

October 10: Notifications are scoped to in-app and browser delivery per user instruction; no email provider is required. Demo Settings now exposes the schedule time zone. Browser verification saved America/New_York, confirmed persistence after reload, rejected Not/AZone with a visible validation message, and restored America/Denver. The production build passes. Browser notifications require permission and an open dashboard; background push delivery is not implemented.

Notification preferences now commit to their browser preference store before changing effective UI choices; failed writes report an error and retain prior settings. Demo-controller preference saves also roll back on persistence failure. Browser-managed choices synchronize without a second competing preference write. All 58 frontend tests and the production build pass. Browser verification toggled in-app delivery off, confirmed it remained off after reload, and restored it on. Storage failure is covered by automated regression tests; UI fault injection was not performed.

Device alert acknowledgement now returns the request promise to the notification panel, allowing request failures to appear beside the inbox rather than being swallowed by the callback. Acknowledgement buttons show pending progress and prevent overlapping submissions until the request completes. All 58 frontend tests and the production build pass. Connected-board UI behavior remains unverified without a live controller.

Controller telemetry, configuration, controls, status and dashboard sensor discovery requests now use a 10-second abort deadline, including response-body reading. Timed-out mutations explicitly report that the change may already have been applied and are never automatically retried. Dashboard polling skips overlapping sync cycles. Regression tests cover stalled JSON transfer, no mutation retry, successful data and HTTP rejection. All 60 frontend tests and the production build pass; physical network-failure testing is pending.

Setup sensor discovery now uses the same bounded request path as dashboard discovery while preserving the specific restart-required message for HTTP 503. Malformed device lists are rejected before rendering discovery results. Request errors retain HTTP status for contextual UI handling. All 60 frontend tests and the production build pass. Live board discovery remains unverified.

Sign-out now attempts credential removal from both session and remembered browser storage even if one is inaccessible. It reports incomplete removal through the settings status rather than claiming success, clears the entered token on success, and prevents overlapping settings actions. Regression tests confirm both stores are attempted and unrelated inventory/rule keys are preserved. All 62 frontend tests and the production build pass. Browser storage-denial UI testing remains unperformed.

Automation editor Save and Delete now share a pending operation state, disable concurrent submissions and display progress. Errors clear at the next attempt and pending state releases after failure. All 62 frontend tests and the production build pass. The asynchronous editor controls are build-verified; connected-controller UI timing remains unverified.

HVAC settings require explicit numeric entries; clearing the sensor offset no longer silently saves zero. Draft parsing rejects empty, invalid and nonnumeric values while preserving explicit zero and negative offsets. Required form inputs and pending save feedback prevent repeated submission. The sensor offset label now covers addressed digital sensors as well as analog sensors. All 63 frontend tests and the production build pass; conditional form UI is build-verified.

Configuration save now requires an explicit simulation session as well as development mode, no live API and no admin token before writing demo inventory. A disconnected signed-out device session therefore requests authentication instead of silently applying hardware configuration to the demo. Eligibility regression covers device, unknown/prototype, online, authenticated and production sessions. All 64 frontend tests and the production build pass. Live disconnected-device UI verification remains pending.

Alert history now distinguishes finite calendar timestamps, controller uptime and unavailable time. Epoch zero is preserved as a valid timestamp; malformed, negative and nonfinite values no longer render NaN or fabricated zero uptime. Regression tests cover both valid clock types and invalid values. All 65 frontend tests and the production build pass. Firmware equipment execution still requires a commissioned output driver; this remains a functional completion gap.

Firmware automation now receives enabled security-contact sources under security.<id>.active from the existing contact sampler. Only matching IDs with healthy status and boolean values become actionable; stale/missing contacts map to null and disabled sensors are omitted. All 22 firmware host tests and the ESP32-S3 build pass (77,872 bytes static RAM; 993,285 bytes flash). Rule-builder source selection, browser telemetry integration and physical contact verification remain unfinished; this source connection does not establish a commissioned alarm system.

Enabled security contacts are now selectable by stable identity in trigger/restore source menus. The dashboard reads authenticated contact snapshots; browser evaluation requires healthy boolean readings received within 10 seconds and preserves false states. Failed requests remove contact readings rather than reusing old data. All 66 frontend tests and the production build pass. The source menu and endpoint synchronization are build-verified; live contact/browser commissioning remains pending.

Configuration-save feedback now lists both temperature buses and security inputs when the controller reports either requires restart. Temperature discovery guidance appears only for pending temperature inputs; commissioning remains explicit. Regression tests cover each pending group and both together. All 67 frontend tests and the production build pass.

Controller-confirmed inventory is now validated before configuration-save results replace dashboard state. Matching schema versions alone cannot accept malformed inventory arrays or unsafe identities. Rejection explains that the controller state must be reloaded and verified because the remote save may already have occurred. Regression tests preserve the submitted profile when malformed responses are rejected. All 68 frontend tests and the production build pass.

Controller configuration reads now validate setup state, supported inventory schema and raw inventory structure before normalization. Missing inventories cannot silently turn into default equipment during sign-in/background refresh. Regression tests accept a valid controller configuration and reject missing inventory, coerced setup flags and malformed lists. All 69 frontend tests and the production build pass; live compatibility verification remains pending.

Background configuration failures now retain the current inventory instead of replacing it with demo defaults. Authenticated initialization reports the failure. Periodic configuration refresh is independent of temperature discovery, so restart-pending or failed discovery cannot prevent installed inventory updates. Profile updates honor cancellation. All 69 frontend tests and the production build pass; disconnected-controller browser verification remains pending.

Dashboard temperature/contact freshness now uses conservative request-start timestamps rather than response-arrival time. Transport delay cannot make old readings appear fresh. Invalid negative, nonfinite or nonnumeric temperature ages produce unavailable timestamps. Regression tests cover explicit sample age and malformed ages. All 70 frontend tests and the production build pass; live network-delay verification remains pending.

Missing temperature sample age no longer defaults to fresh zero age. The freshness helper requires an explicit age; contact snapshots explicitly use their request-start bound while temperature snapshots require the controller age field. Regression covers undefined age. All 70 frontend tests and the production build pass.

Browser automation source reads no longer substitute browser-local time for missing controller time in hardware sessions. Local-minute readings must be integers from 0 through 1439; invalid explicit readings remain unavailable in all modes. Demo legacy clock fallback remains available. Regression covers missing hardware clock, midnight/end-of-day boundaries and invalid minute values. All 71 frontend tests and the production build pass.

HVAC temperature aliases now carry the selected sensor timestamp and require healthy samples no older than 30 seconds, matching direct temperature-source freshness. Stale, future-dated or missing sensor timestamps cannot activate alias rules. Regression covers fresh/stale/future/missing timestamps. All 72 frontend tests and the production build pass.

Dashboard discovery mapping now requires exactly one matching bus/address for each enabled DS18B20 sensor. Failed/malformed discovery clears addressed readings; duplicate identities cannot select an arbitrary reading. Regression covers case-normalized ROM match, duplicate identities, disabled sensors, wrong bus and missing ages. All 73 frontend tests and the production build pass.

Security contact mapping now accepts only uniquely matched enabled sensor identities from confirmed inventory. Null/duplicate/unconfigured readings cannot enter the dashboard source list; malformed active values and unhealthy statuses become unavailable. Friendly names come from configuration. Regression covers duplicate, disabled, null, malformed and stale readings plus healthy false. All 74 frontend tests and the production build pass.

Direct temperature and HVAC-alias automation source reads now require finite numeric temperatures, matching dashboard sensor projection and firmware numeric source requirements. Boolean/text/null/nonfinite samples cannot trigger temperature comparisons. Regression covers both source paths. All 75 frontend tests and the production build pass.

Contact-condition authoring now validates equality/inequality/changes and explicit true/on or false/off meanings. Selecting a contact initializes equality with active true and value placeholders explain active/inactive states. Regression covers valid boolean values and unsupported numeric comparisons. All 76 frontend tests and the production build pass. Firmware direct-API condition validation still needs matching contact restrictions; UI conditional hints are build-verified.

Firmware direct-API validation now requires contact conditions to use equality/inequality/changes and boolean active/inactive values, matching editor restrictions. Host regression rejects numeric values/comparisons and accepts active and changes conditions. All 23 firmware host tests and the ESP32-S3 build pass (77,872 bytes static RAM; 993,581 bytes flash). Physical contact commissioning and equipment automation remain pending.

Firmware boolean comparison execution now normalizes case, matching accepted contact values and browser semantics. A host regression executes a capitalized True rule against an active contact and confirms one activation. All 23 firmware tests and the ESP32-S3 build pass (77,872 bytes static RAM; 993,657 bytes flash). Physical input verification and equipment output commissioning remain pending.

Trigger and restore comparison menus now filter security-contact choices to equality, inequality and changes. Unsupported saved operators remain visibly labeled unavailable rather than silently replaced. Regression verifies contact choices and retention of numeric/time range choices. All 77 frontend tests and the production build pass; conditional menu rendering is build-verified.

Change comparisons no longer treat recovery from null/nonfinite previous samples as a real transition, matching firmware availability semantics. Valid boolean transitions remain actionable, including false-to-true and true-to-false. Regression covers unavailable recovery and stable/changed boolean values. All 78 frontend tests and the production build pass. Physical output integration still requires the relay/output board mapping.

Setup drafts now survive background inventory refresh while dirty. Successful save releases the draft to the confirmed profile; failed save retains edits. An explicit Discard Edits and Reload control restores current inventory. Profile edits/imports are ignored during save to prevent edits being silently included or lost in an in-flight request. All 78 frontend tests and the production build pass. Draft-refresh interaction is build-verified; browser race verification remains pending.

Browser verification of setup draft workflow: editing Demo RV to Draft verification RV displayed the unsaved-edit indicator and discard control; Discard Edits and Reload restored Demo RV and displayed confirmation. No configuration was saved during this check. This verifies local edit/discard behavior, not the live background-refresh race.

Configuration imports now validate raw JSON inventory before normalization can substitute defaults. Malformed lists and coerced flags are rejected, invalid JSON has a clear message, and UTF-8 input size is bounded. Import is disabled during save. Regression covers valid inventory, invalid JSON/version/list/flags and oversize input. All 79 frontend tests and the production build pass; browser import verification remains pending.

Browser import/export verification: Export Configuration downloaded diy-rv-configuration.json; the actual file passed importProfileJson validation and contained Demo RV, two HVAC zones and two addressed sensors. Importing the same file through the browser chooser displayed Imported for review. Save to apply. and the unsaved indicator. Discard restored the clean current inventory; no save was performed. Screenshot: frontend/demo-configuration-import.png (local ignored artifact).

### Setup drafts across page navigation (October 10)
- Kept the Setup Wizard mounted in a hidden container when visiting other pages, preserving unsaved inventory, selected equipment, and discovery results during navigation.
- Browser verification: edited RV name without saving, visited Automations, returned to Setup, and confirmed the draft remained. Discard restored Demo RV; no test inventory was saved. Browser error log was empty.
- Validation: 79 frontend tests passed; production build passed. Existing bundle-size warning remains. Drafts are session-only and must be saved before closing or reloading the browser.

### Controller credential replacement (October 10)
- Sign-in writes the new credential before clearing its previous persistence scope. It snapshots both stores and restores them if writing or clearing fails; unavailable storage prevents changes. A failed rollback produces explicit cleanup guidance rather than claiming sign-in succeeded.
- Validation: 84 frontend tests passed, including failed writes, failed cleanup, unavailable storage, persistence-scope selection, and failed rollback. Production build passed before the additional test-only rollback case. Actual controller authentication remains hardware-dependent and was not exercised by this change.

### Pending settings dialogs (October 10)
- Automation save/delete and HVAC save now keep their dialogs open while awaiting completion. Cancel, close, and backdrop dismissal are disabled during the operation, retaining visible failure feedback. Dialogs announce their busy state for assistive technology.
- Validation: 84 frontend tests passed and production build passed. Browser smoke check confirmed the populated automation editor opens and idle Cancel closes it, with no browser errors. A delayed physical-controller operation was not exercised; pending dismissal behavior is currently verified by implementation inspection rather than a live device test.

### Re-importable configuration exports (October 10)
- Exports now use compact JSON and pass the same raw validation and byte limit as imports before download. Invalid or oversized drafts produce visible errors. Download URLs remain available briefly instead of being immediately revoked; feedback clarifies that exports include current unsaved edits.
- Validation: 85 frontend tests and production build passed. Browser downloaded the populated Demo RV export; the actual downloaded file passed import validation with two HVAC zones and two addressed sensors.

### Preserve unreadable firmware automation storage (October 10)
- Firmware distinguishes a new/absent automation store from an unreadable, malformed, oversized, unsupported, or unrestorable saved state. The latter is retained in NVS; automation execution and rule edits are disabled instead of overwriting it with an empty inventory.
- Telemetry reports an explicit storage error, and editing endpoints return recovery guidance. No automatic erase or recovery reset is provided; retain the device storage for diagnosis before repairing it.
- The portable firmware suite passed 23 tests. These cover state validation and evaluator logic, not the NVS fault path. Physical storage fault injection and reboot activation persistence remain required.
- ESP32-S3 build passed: static RAM 77,872 bytes; flash 994,129 bytes. No hardware flashed.

### Keyboard dismissal respects pending operations (October 10)
- Removed the application-level Escape handler that bypassed pending HVAC/automation dialog guards. Each modal now handles Escape using its current busy state; idle dialogs retain keyboard dismissal.
- Validation: 85 frontend tests and production build passed. Browser verification opened an existing automation and dismissed it with Escape without saving changes. Pending-device behavior remains implementation-inspected until delayed controller requests can be exercised.

### Accepted commands with failed telemetry confirmation (October 10)
- Device command dispatch distinguishes controller rejection from successful command acknowledgement followed by failed telemetry refresh. The latter explicitly reports acceptance and asks the operator to verify state before resending; it never automatically repeats the mutation. Confirmation uses the same token as the command.
- Validation: 88 frontend tests and production build passed. New tests exercise accepted/failed confirmation, rejected commands without a follow-up read, and authenticated successful confirmation. This request-level fault simulation does not establish physical equipment operation.

### GitHub validation reconciliation (October 10)
- Queried live Actions run 38047300593 for commit 1904cb9: frontend succeeded; ESP32 firmware compilation and Windows firmware bootstrap were still running. These results do not establish complete remote CI success.
- Added workflow concurrency by workflow/ref, cancelling superseded revisions when a newer branch or PR push arrives. Independent branches and pull requests retain separate validation groups. This avoids accumulating obsolete firmware builds while changes are reconciled.

### Independent credential-store reads (October 10)
- Browser credential lookup now reads session and remembered storage independently. Inaccessible session storage no longer hides an available remembered token, and session credentials retain priority. No readable token returns unauthenticated state.
- Validation: 91 frontend tests and production build passed, including getter/read failures, session precedence, and absent credentials. No new credential was entered or saved during verification.

### Preserve activation during unrelated inventory edits (October 10)
- Runtime configuration compares temperature buses, addressed temperature sensors, HVAC zones and security sensors before resetting the automation engine. Unrelated RV/equipment edits preserve current activation and hold state; startup, input mapping changes and setup-status changes still reset it.
- 24 firmware host tests passed, including unchanged-input and changed-contact profile comparisons. This does not implement activation persistence across reboots. Configuration saves still mark temperature acquisition pending restart; reducing that restart scope remains outstanding.
- ESP32-S3 build passed: static RAM 77,872 bytes; flash 994,349 bytes. Hardware behavior not exercised.

### Temperature restart scope (October 10)
- Configuration saves now mark temperature acquisition pending restart only when temperature bus inventory or first-boot setup status changes. RV labels, notification/network settings, security sensors and addressed-sensor assignments no longer interrupt an unchanged bus by themselves. An already-pending restart stays pending until reboot; parse/allocation failure conservatively requires restart.
- 24 firmware host tests passed with added unchanged/changed bus comparisons. Physical configuration-save/discovery behavior remains bench-unverified.
- ESP32-S3 build passed: static RAM 77,872 bytes; flash 994,557 bytes. No hardware flashed.

### Reject ambiguous firmware temperature readings (October 10)
- Firmware now requires exactly one discovered reading matching the configured bus and ROM address, consistent with frontend mapping. Duplicate matches supply null to the named sensor and HVAC alias rather than selecting the first reading. Other uniquely mapped zones retain their readings.
- 24 firmware host tests passed with duplicate-discovery coverage for both named sensor and HVAC alias. Physical bus discovery remains bench-unverified.
- ESP32-S3 build passed: static RAM 77,872 bytes; flash 994,573 bytes. No hardware flashed.
