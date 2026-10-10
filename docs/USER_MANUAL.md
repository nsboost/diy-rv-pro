# DIY RV PRO user manual

Engineering edition - 2026-10-09. This edition describes the current interface
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
commissioning. Export/restore and complete first-boot enrollment remain unfinished.

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

The Automation page provides rule editing in the demo. The controller does not
yet implement the complete persistent automation engine. Do not rely on it for
scheduled heating, generator starting, water protection or alarm response.

## Optional security

Security sensors are planned as an optional expansion. Door/window contacts,
motion/presence, tamper, battery and heartbeat states require supported hardware
and enrollment. The current configuration definitions do not provide a working
alarm system. Independent smoke, CO and propane alarms remain necessary.

Firmware now includes a local dry-contact GPIO sampler and authenticated
`/api/security/inputs` endpoint. Its readings are not yet connected to the main
dashboard, and physical operation is pending bench verification. See the
[contact bench sheet](WIRING_SECURITY_CONTACT_BENCH.md). This does not implement
the optional remote expansion module, arming or alarm response.

Cameras and native streaming audio are deferred and are not promised features
of this release. Legacy camera configuration fields may still appear while the
editor is being aligned with the revised scope.

## Maintenance and recovery

Use the installation record to identify the board and firmware before updating.
Do not erase flash or substitute board variants as a routine troubleshooting
step. Configuration backup/restore, signed updates and documented recovery are
required before deployment and remain under development. Report observed
errors with device identity and software version, excluding passwords/tokens.

See [Installation Manual](INSTALLATION_MANUAL.md),
[Bill of Materials](BILL_OF_MATERIALS.md) and
[Delivery Status](DELIVERY_STATUS.md) for current support boundaries.
