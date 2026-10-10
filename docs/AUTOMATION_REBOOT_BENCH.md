# Automation persistence and reboot bench verification

Status: procedure prepared; no physical results recorded. The current build
target is ESP32-S3-DevKitC-1-N8. A compiled image and host regression suite do
not satisfy this procedure. Keep equipment loads disconnected; use notification
rules for these checks. Never use generator/HVAC outputs as test indicators.

## Record before testing

| Field | Recorded value |
| --- | --- |
| Physical board model/revision and identifying photograph | Not recorded |
| Verified USB/serial port | Not recorded |
| Firmware commit/image checksum and frontend version | Not recorded |
| Flash procedure and retained pre-test backup | Not recorded |
| Temperature bus GPIO, physical ROM addresses, wiring sheet | Not recorded |
| Reference thermometer and observed sample/fault status | Not recorded |
| Test operator/date and evidence location | Not recorded |

Use a known test profile and export it before changing rules. Retain device
storage before any destructive recovery. Existing version-1 records contain no
activation history; the first subsequent save migrates to version 2. Do not
claim duplicate suppression for activation that was never stored by version 1.
Do not include admin tokens or Wi-Fi passwords in evidence.

## Required tests

For each row, record PASS/FAIL, exact firmware revision, rule ID, alert IDs,
observed readings/status, before/after telemetry and boot log. Blank results are
unverified. Reboot success requires observed behavior after an actual reboot.

| Test | Action | Expected result |
| --- | --- | --- |
| Stable activation | Create an enabled addressed-temperature notification rule, zero hold, and drive its input across the threshold | Exactly one new alert; rule active; storage error absent |
| Steady-condition reboot | Reboot while the same physical condition remains true | Same rule remains active; retained alert ID remains; no new alert solely due to reboot |
| Unavailable boot input | Reboot with the probe disconnected; reconnect while its value still matches | Fault/unavailable source cannot execute; restored activation remains; reconnection alone does not duplicate the alert |
| Healthy recovery/rearm | For a rule without restore, produce a healthy nonmatching value, reboot, then cross the threshold again | Rule rearms; new condition produces exactly one new alert |
| Explicit restore | Enable a restore notification; trigger, reboot, then meet its restore condition | Exactly one restore alert; activation clears and stays cleared after another reboot |
| Hold restarts fresh | Reboot partway through a nonzero hold, then provide continuously valid matching readings | Old uptime is not reused; a complete new hold is required |
| Acknowledge persistence | Acknowledge a triggered alert, reboot with condition unchanged | Same alert is read; activation remains; no duplicate delivery |
| Rule edit isolation | Activate two rules; edit/disable/delete one and reboot | Intended rule change persists; unrelated activation remains; deleted rule is absent |
| Unrelated inventory edit | Activate a rule, change RV name, then inspect discovery and reboot | Bus discovery remains available; activation is not reset merely by the name change |
| Bus configuration change | Save a bus GPIO/enable change | Temperature inputs explicitly require restart; discovery does not silently continue under the new mapping |
| Version-1 migration | On a disposable bench device with a retained valid version-1 store, save a rule or acknowledgement | Existing rules/alerts preserved; complete version-2 state written; no invented historical activation |
| Corrupt/unreadable state | Inject a controlled malformed saved record on a disposable bench device after backing it up | Original retained; visible storage error; automation execution/editing disabled; no silent empty-state overwrite |
| Allocation failure | Use an instrumented bench build to fail assembly/serialization/startup allocations | No incomplete saved record; failure visible; saved rules/alerts retained; no successful-action claim without commit |
| Commit failure | Instrument NVS set/commit failure during trigger, restore and healthy rearm | No uncommitted snapshot claimed durable; failure reported; no automatic erase |
| Interrupted power | On an isolated bench supply, interrupt power around notification/activation commits and restart | Readable complete old or new state; no partially assembled record; record any alert replay and treat it as failure pending investigation |
| Flash write count | Instrument successful NVS commits; run a steady triggered rule through repeated ticks | No repeated commit every tick for unchanged activation; count actual commits rather than inferring them from RAM state |

Browser notification delivery must be checked separately with permission granted
and the dashboard open. Reopening the browser must not replay every historical
alert as a new OS notification. Denied permission must produce clear delivery
status without losing in-app alert access.

## Release gate

All required rows need measured results. Host tests cover saved-state validation,
activation-only restore, missing-input recovery and allocation failures during
record assembly. They do not cover real NVS atomicity, serial flashing, supply
interruption or browser/OS notification delivery. Keep any failed result with
its evidence and fix it before commissioning dependent equipment.
