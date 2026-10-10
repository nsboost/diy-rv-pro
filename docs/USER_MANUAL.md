# DIY RV PRO user manual

Engineering edition - 2026-10-10. This edition describes the current interface
and explicitly identifies unfinished installed-controller workflows.

## Current operation

The dashboard provides an overview, while Climate, Power, Tanks, Generator,
Automation, History, Settings and Setup open separate views. Current values and
control responses are simulated. Do not use displayed tank levels, temperatures,
battery state or generator status as evidence of the condition of an RV.

The firmware currently supports Wi-Fi/web serving, a configuration API and NVS
storage, but successful compilation is not proof of operation on connected
hardware. Real equipment operation and commissioning are not yet released.

## Configuration editor

Open Setup to edit the RV profile and equipment lists. Add only equipment you
intend to install; use labels that identify its location. Fields include sensor
types, communication choices, relay/GPIO assignments and selected alarm/timing
settings. A dropdown selection does not establish that a driver is implemented.

Choose monitor-only when the controller should observe equipment without
operating it. Self-controlled equipment retains its own control authority.
Controller-managed equipment needs a verified interface, feedback and operating
limits. A saved profile must eventually pass commissioning before outputs are
enabled; that full workflow is still being implemented.

Each configured item has a stable internal identity separate from its displayed
label. New items get new identities even after another item is deleted. Imported
or older profiles with missing/duplicate identities cannot be saved until their
identities and references are corrected; the controller does not guess which
device a conflicting reference intended.

In the standalone browser demo, configuration is saved in that browser when
storage is available. Equipment actions are explicitly labeled as simulated. The
production dashboard requires authentication and controller acknowledgement
before accepting a saved profile. Connection or save failures remain errors;
they do not become local saves. A successful device save still requires
commissioning. Complete installed first-boot enrollment still requires hardware verification.

### Saving, backups and imports

Unsaved setup edits survive switching to another page and controller refreshes.
They do not survive closing or reloading the browser tab. Save Configuration
applies the inventory; Discard Edits and Reload restores the latest loaded
inventory. A failed save retains your draft and displays the error.

Export Configuration downloads the current draft, including unsaved edits, as
compact JSON. Export validates the draft and the 24,576-byte import limit before
download. Import Configuration validates a JSON file and opens it for review;
it does not apply it until you choose Save Configuration. Preserve a known-good
export before changing equipment. Firmware upgrade migration is unfinished.

### Addressed temperature sensors and HVAC zones

Configure a Temperature Bus with its GPIO and give it a location label. Save
bus changes and restart an installed controller before discovering sensors.
Use discovery to select each DS18B20 address on that bus, then label the sensor
with its location, such as Living Room or Bedroom. Each physical sensor has its
own ROM address even when multiple sensors share the same bus input.

In HVAC Zones, select the configured temperature sensor for each zone. In an
automation, choose that sensor's named temperature source. Selection follows
its configured identity and physical address; a matching label cannot substitute
another sensor. Invalid ROM addresses, duplicate addresses and conflicting GPIO
assignments are rejected. The demo uses sample discovery readings. Actual bus
capacity and wiring reliability require bench verification; a configured count
is not a guarantee that twelve sensors will operate on a particular cable.

## Climate, water and power

Climate settings and generator buttons currently change simulated behavior.
The Power and Tanks views are not yet connected to installed measurement
devices. Retain existing equipment controls and gauges until the released
hardware configuration has passed commissioning.

The installed-system release must show sensor faults and stale readings,
distinguish requested actions from confirmed equipment state, explain rejected
commands and preserve manual overrides. Those behaviors remain acceptance
requirements, not current guarantees.

## Automation

The Automation page supports creating, editing, enabling and disabling rules.
Select a configured Sensor / State, comparison, threshold or range, and hold
duration. Choose an equipment group, installed target, and supported action.
Enable Cancel / Restore when a separate condition should reverse the action.
The editor rejects removed sources, unsupported actions and malformed values.
A rule referring to removed equipment displays Needs configuration; reconnect
its intended target rather than assuming a replacement.

Time ranges use HH:MM and can cross midnight. In the standalone demo, configure
the schedule time zone in Settings. Device schedules use the controller's
configured time zone and synchronized network clock; they wait when its clock
is unavailable. Contact inputs use true for active and false for inactive, with
equality, inequality or change comparisons. Faulted, disconnected or stale
temperature/contact inputs cannot satisfy their conditions.

The browser demo evaluates and persists rules and alert activation. Firmware
contains a persistent rule store and an alert runtime using addressed
temperatures and local contacts. Its version-2 NVS record stores successful
activation with notifications and restores activation after startup; hold and
retry timers start fresh. Version-1 records remain readable without inventing
past activation. Physical reboot and interrupted-write tests are still pending.
Physical equipment actions and the complete source set remain unfinished. Do not rely on
this engineering release for installed HVAC, generator or protection control.
Save/delete dialogs stay open until an outstanding operation finishes.

## Notifications

Delivery is in-app and browser only; email and SMS are not configured. Choose
Send Alert / Notification in an automation and supply its message. Open
Notifications from navigation or the alert control to inspect and acknowledge
alerts. A failed acknowledgement remains visible as an error and can be retried.
Acknowledgement marks an alert read; it does not reset an equipment condition.

In-app and browser delivery have separate preferences saved in this browser.
Browser notifications require browser permission and an open dashboard. If
permission is denied or unavailable, the page explains the delivery state.
This release does not provide background delivery after the dashboard closes.
A browser alert is separate from a smoke, CO or propane detector.

## Optional security

Security sensors are planned as an optional expansion. Door/window contacts,
motion/presence, tamper, battery and heartbeat states require supported hardware
and enrollment. The current configuration definitions do not provide a working
alarm system. Independent smoke, CO and propane alarms remain necessary.

Firmware now includes a local dry-contact GPIO sampler and authenticated
`/api/security/inputs` endpoint. Configured contacts are displayed in the interface and available as automation
sources; physical operation is pending bench verification. See the
[contact bench sheet](WIRING_SECURITY_CONTACT_BENCH.md). This does not implement
the optional remote expansion module, arming or alarm response.

Cameras and native streaming audio are deferred and are not promised features
of this release. Legacy camera configuration fields may still appear while the
editor is being aligned with the revised scope.

## Maintenance and recovery

Use the installation record to identify the board and firmware before updating.
Do not erase flash or substitute board variants as a routine troubleshooting
step. JSON inventory export/import is available as described above. Signed updates,
complete upgrade migration and installed recovery remain under development. Report observed
errors with device identity and software version, excluding passwords/tokens.

For an automation storage fault, connect with the admin token and open Settings
then **Download Automation Backup**. Keep the downloaded
`diy-rv-automation-recovery.bin` unchanged. It contains the original saved record,
including any damaged bytes; it is separate from the JSON inventory backup.
The button requires an authenticated connection. Downloading does not erase data,
repair rules or resume automation. Repair/import and physical recovery testing
remain under development. If download fails, the original is still retained;
do not erase flash as a workaround.

If NVS initialization itself fails, firmware now retains the partition and stops
startup with a serial diagnostic instead of automatically erasing configuration,
credentials and recovery records. The dashboard will be unavailable in that case;
partition-level maintenance recovery is required. The authenticated record-repair
API can only operate when NVS is readable. Its import menu and device fault tests
remain unfinished.

See [Installation Manual](INSTALLATION_MANUAL.md),
[Bill of Materials](BILL_OF_MATERIALS.md) and
[Delivery Status](DELIVERY_STATUS.md) for current support boundaries.
