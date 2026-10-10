# DIY RV PRO Local API

The ESP32-S3 serves the dashboard and local JSON API over the device access point or configured LAN address.

## Endpoints

- `GET /api/status`: device status, setup state, firmware version, target, and
  `stationStatus` (`disabled`, `connecting`, or `connected`). Station status reflects
  the running network configuration; saved network changes require a restart.
  `clockStatus` is `synchronized` or `unavailable`; local scheduled rules require
  synchronized network time and a supported configured IANA zone.
- `GET /api/telemetry`: authenticated snapshot, rules and persisted notifications. Equipment telemetry is explicitly marked `controller.equipmentMode: "prototype-simulation"`.
- `GET /api/config`: sanitized configuration, including the saved RV feature profile. Requires authorization after setup.
- `GET /api/automation/backup`: authenticated, uncached download of the exact
  `rv_automation/state` NVS blob as `application/octet-stream`. Includes corrupt
  bytes and the stored terminator, without parsing or modifying the record.
  Returns 404 for an absent record and 500 for unreadable, empty, oversized
  (over 65,537 bytes) or allocation-failed records; originals remain untouched.
  This backup does not clear faults or import repaired data.
- `GET /api/automation/original`: authenticated raw download of the most recent
  original record retained by recovery. Returns 404 if no retained original exists.
- `POST /api/automation/recovery`: authenticated recovery of a validated version-1
  or version-2 JSON record, body limit 65,536 bytes. Available only while automation
  storage is faulted and no successful recovery is awaiting restart. Firmware
  prepares a version-2 copy with all rules disabled and activation cleared, retaining
  notifications. It commits and reads back a separate original-record backup before
  replacing the working record. A successful response is 202 with `saved: true` and
  `restartRequired: true`; execution and edits stay blocked until restart. No
  multi-key atomic transaction is claimed. Failed commits require checking state
  before retrying. Eight original-copy slots are retained without overwriting; a full
  slot set, oversized/unreadable original or memory/storage failure blocks recovery.
  Settings provides local review/discard, disabled-rule recovery save and original
  download. On-device interrupted-write tests are not yet complete.
- `PUT /api/config`: first-boot setup and subsequent configuration updates.
- `POST /api/control`: rule CRUD, notification acknowledgment and prototype equipment controls. Always requires authorization. Body limit: 4,096 bytes.
- `WS /ws/telemetry`: authorized telemetry WebSocket handshake.

- `GET /api/temperature/devices`: authenticated detected DS18B20 ROMs, bus IDs, temperatures, status and sample age. Returns 503 until restart after a saved configuration change.

## Authorization

Control and post-setup configuration requests must include:

```http
Authorization: Bearer <admin-token>
```

The firmware stores only the SHA-256 hash of the admin token in NVS. Wi-Fi credentials are stored in the device configuration namespace so the AP can be secured after first boot. The first `PUT /api/config` must provide an `adminToken` with at least 16 characters and an `apPassword` with at least 8 characters. No default admin token or AP password is compiled into the firmware.

First-boot setup example:

```json
{
  "adminToken": "replace-with-16-plus-characters",
  "apSsid": "DIY-RV-PRO",
  "apPassword": "replace-me",
  "stationSsid": "Campground-5G",
  "stationPassword": "optional-lan-password",
  "timezone": "America/Denver",
  "features": {
    "schemaVersion": 1,
    "rvProfile": {
      "name": "Coach",
      "rvType": "Class A",
      "lengthFt": 40,
      "electricalService": "50A",
      "shorePower": "50A split phase"
    },
    "features": {
      "hvac": true,
      "power": true,
      "solar": true,
      "generator": true,
      "water": true,
      "tanks": true,
      "temperatureMonitoring": true,
      "automation": true,
      "cameras": true,
      "security": true
    },
    "hvacZones": [
      {
        "enabled": true,
        "id": "hvac-1",
        "label": "Front HVAC",
        "controlMode": "controller",
        "equipment": ["air-conditioner", "furnace"],
        "coolRelay": 1,
        "furnaceRelay": 2,
        "heatPumpRelay": -1,
        "fanRelay": 3,
        "temperatureSensorId": "fridge-1",
        "tempSensorGpio": -1
      }
    ],
    "temperatureBuses": [{"id":"temp-bus","label":"Temperature bus","enabled":true,"type":"onewire","gpio":4}],
    "temperatureZones": [
      {
        "enabled": true,
        "id": "fridge-1",
        "label": "Fridge",
        "type": "fridge",
        "sensorType": "ds18b20",
        "busId": "temp-bus",
        "address": "2801000000000029",
        "tempSensorGpio": -1,
        "lowAlarmF": 34,
        "highAlarmF": 42
      }
    ],
    "solarChargeControllers": [
      {
        "enabled": true,
        "id": "solar-1",
        "label": "Roof MPPT",
        "type": "mppt",
        "communication": "ve.direct",
        "maxCurrentA": 50,
        "adcChannel": -1,
        "senseGpio": -1
      }
    ],
    "inverters": [
      {
        "enabled": true,
        "id": "inverter-1",
        "label": "Main Inverter",
        "type": "inverter-charger",
        "communication": "canbus",
        "maxCurrentA": 100,
        "adcChannel": -1,
        "senseGpio": -1
      }
    ],
    "batteries": [
      {
        "enabled": true,
        "id": "battery",
        "label": "House Battery",
        "type": "lithium",
        "communication": "canbus",
        "capacityAh": 400,
        "adcChannel": -1,
        "senseGpio": -1
      }
    ],
    "generators": [
      {
        "enabled": true,
        "id": "generator-1",
        "label": "Onboard Generator",
        "fuelType": "diesel",
        "controlStrategy": "two-wire",
        "confirmationStrategy": "run-sense-gpio",
        "startRelay": 4,
        "stopRelay": -1,
        "runSenseGpio": 21,
        "rpmInputGpio": -1,
        "maxCrankSeconds": 10,
        "warmupSeconds": 30,
        "cooldownSeconds": 60
      }
    ],
    "acBreakers": [],
    "dcCircuits": [],
    "waterTanks": [],
    "waterHeaters": [],
    "waterPumps": [],
    "propaneSystems": [],
    "weatherStations": [],
    "cameras": [
      {
        "enabled": true,
        "id": "camera-entry",
        "label": "Entry Camera",
        "role": "entry",
        "protocol": "webrtc",
        "streamUrl": "https://camera-gateway.local/entry/webrtc",
        "snapshotUrl": "https://camera-gateway.local/entry/snapshot.jpg",
        "gatewayName": "go2rtc",
        "requiresAuth": true,
        "recordMotion": false
      }
    ],
    "securityZones": [
      {
        "enabled": true,
        "id": "zone-entry",
        "label": "Entry Doors",
        "type": "perimeter",
        "armHome": true,
        "armAway": true,
        "entryDelaySeconds": 30,
        "exitDelaySeconds": 45
      }
    ],
    "securitySensors": [
      {
        "enabled": true,
        "id": "door-main",
        "label": "Main Door",
        "type": "door",
        "zoneId": "zone-entry",
        "inputType": "i2c-expander",
        "contactPolarity": "normally-closed",
        "gpio": -1,
        "expanderAddress": 32,
        "expanderPin": 0,
        "tamperGpio": -1,
        "heartbeatSeconds": 0
      }
    ],
    "customIo": []
  }
}
```

The `features` object is optional during first setup and can be saved later from Settings. The firmware stores it with a schema version and falls back to disabled defaults when no compatible feature profile is present. Arrays are bounded by firmware validation: 8 HVAC zones, 32 temperature zones, 8 solar controllers, 6 inverters, 8 batteries, 2 generators, 48 AC breakers, 64 DC circuits, 12 tanks, 4 water heaters, 8 pumps, 8 cameras, 16 security zones, 64 security sensors, and 64 custom I/O entries. Use `-1` for intentionally unused GPIO, ADC, relay, expander address, and expander pin slots.

Camera entries are configuration metadata for the dashboard and an external camera/NVR/gateway. The ESP32-S3 must not decode, transcode, proxy, or buffer RTSP/H.264 streams. For RTSP cameras, configure an external gateway such as an NVR, Home Assistant, go2rtc, or Frigate to expose browser-safe WebRTC, HLS, MJPEG, or snapshot URLs.

Safety validation rejects enabled hardware profiles that cannot be operated or monitored safely. Examples: enabled HVAC zones need at least one output relay, enabled generators need a start relay, enabled tanks need a sensor type, controller-managed water heaters need at least one heating output, controllable breakers need a relay, enabled power devices need communications or a sensor input, enabled cameras need a stream or snapshot URL, and enabled security sensors need an input strategy.

## Control Actions

Supported first-milestone actions are intentionally simulation-only:

```json
{ "type": "generator.start" }
{ "type": "generator.stop" }
{ "type": "automation.setEnabled", "id": "quiet-hours", "enabled": true }
{ "type": "hvac.setTarget", "zoneId": "zone-1", "setpointF": 73 }
```

Unsupported actions are rejected with `400 Bad Request`; unauthenticated actions are rejected with `401 Unauthorized`.

The dashboard reads an optional `diy-rv-admin-token` value from browser local storage. When present and the ESP API is reachable, simulated controls are also posted to `/api/control`; otherwise the dashboard remains usable with local mock state for development.
# Local security inputs

`GET /api/security/inputs` requires the configured bearer token. This endpoint
contains real GPIO sampler state, separate from the simulated `/api/telemetry`
payload. It returns `source: hardware`, `alarmSystemCommissioned: false` and a
`sensors` array with `id`, `label`, `status`, nullable `active`, and `supervised`.

Statuses include `disabled`, `unsupported`, `unsupported-tamper`, `unassigned`,
`reserved-pin`, `pin-conflict`, `hardware-error`, `initializing`, `ok` and `stale`.
Only a settled, recent sample produces a boolean `active`; other states return
null. Debounce is 50 ms; samples older than one second are stale. The GPIO
sampler runs independently of API polling.

Configuration saves report `securityInputsRequireRestart` if runtime application
failed after persistence. Until restart or a successful reapplication, this
endpoint returns 503 rather than readings from an older configuration.
See [W-09A bench wiring](WIRING_SECURITY_CONTACT_BENCH.md). Physical verification,
encrypted transport and integration into the security UI remain pending.


## Addressed temperature and automation contracts

One bus GPIO serves multiple probes. Save an enabled `temperatureBuses` item,
restart the controller, then use **Discover Sensors**. Register each ROM as an
item in `temperatureZones`; HVAC refers to that item's immutable
`temperatureSensorId`. Probe ROMs use 16 hexadecimal characters in wire byte
order including the Dallas CRC; invalid or duplicate ROMs are rejected. Limits
are four buses and 32 registered sensors total. Wiring and electrical loading
must be verified on the actual board; the software limit is not a guaranteed
number of probes on any cable.

Controller rule edits use `automation.upsert` with `rule`,
`automation.setEnabled` with `id` and boolean `enabled`, and
`automation.delete` with `id`. The engine accepts at most 64 rules and 32 KiB
of serialized rule data. Rules and a ring of 64 notifications are saved in
NVS; save errors reject edits without updating the active rules. The task runs
once per second independently of an open dashboard. Missing, disconnected and
stale temperature values cannot satisfy a condition. Continuous hold timing
restarts after a reboot or rule edit. An action latches only after execution
succeeds; failures retry after 30 seconds. Reverse checks execute once per
successful activation.

Implemented device source values currently cover registered DS18B20 sensors and
HVAC zone temperatures resolved through each zone's `temperatureSensorId`.
Both paths require the exact registered bus/address and a healthy sample no more
than 30 seconds old. Disabled sensors and pending bus changes yield unavailable
values; discovery order never assigns a zone's sensor.
`time.local` becomes available after SNTP synchronizes through station Wi-Fi.
The configured IANA zone is converted using generated tzdata 2026.5 / IANA 2026e
recurring rules. Unknown zones are rejected when saving; an old unsupported zone
leaves schedules unavailable. Changes require a restart. AP-only startup has no
network clock and schedules wait; after synchronization the clock continues
through temporary network outages. The SNTP server is `pool.ntp.org`.
Other configured sources remain unavailable until their drivers are integrated.
The browser demo evaluates its explicitly
simulated telemetry and time sources. Controller equipment automation currently
reports an uncommissioned driver and retains the pending action; it does not
claim that a physical output switched. Completing those drivers remains an
active delivery item.

A notification is acknowledged using:

```json
{"type":"notification.acknowledge","id":"notification-id"}
```

Notifications use in-app and browser delivery only. Browser permission and an
open dashboard are necessary for desktop delivery. Demo preferences and alerts
are browser-persistent. Controller notifications include `uptimeMs` until a
wall clock is integrated. No email or SMS gateway is configured.


Storage uses bounded NVS blobs rather than NVS strings for rule/alert envelopes.
The partition table now reserves 256 KiB for NVS so two successive state copies
plus the 24 KiB feature profile fit during updates. This changes flash offsets;
existing flashed prototypes require configuration backup and a full coordinated
firmware/partition/web-image installation, rather than an app-only update. No
board has been flashed by this change.

Inventory identities use 1-32 ASCII letters, digits, hyphens or underscores, beginning with a letter or digit. The reserved identities constructor and prototype are rejected. IDs are unique across the inventory; friendly labels support UTF-8 text within 48 bytes. Imported identities that contain dots, spaces or unsupported characters must be corrected along with every referring sensor, bus, zone and automation reference; identities are never silently renamed.

Enabled tank inventory requires capacityGal greater than zero (maximum 500) and explicit integer emptyMv/fullMv values from 0 to 3300 that differ. Descending calibration is permitted. Disabled inventory can retain incomplete assignments. These bounds validate configuration only; tank input acquisition and physical calibration commissioning remain pending.
