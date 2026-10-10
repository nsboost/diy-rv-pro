# W-09A: local dry-contact bench input

Status: firmware implemented; electrical operation and physical board photograph
pending bench verification. This sheet is for a short, unpowered bench contact,
not an installed RV alarm loop or an equipment voltage output.

Target: ESP32-S3-DevKitC-1-N8. Confirm the physical board and the manufacturer's
pin labels before connecting. Current firmware accepts GPIO4 through GPIO18 and
GPIO21 for this driver; all other pins report `reserved-pin`. A pin referenced
elsewhere in the profile reports `pin-conflict` and is not configured.

## Connection

```text
ESP32-S3                       Isolated voltage-free switch/contact

Internal 3.3 V pull-up
          |
GPIO4 ----+-------------------- terminal A
                                 / contact
GND -------------------------- terminal B
```

Use board labels GPIO4 and GND, not connector position numbers or cable colors.
The diagram does not authorize applying an external voltage. The input is
configured as input-only with its internal pull-up; the driver never energizes
an output. Long RV cable runs require a protected interface, EMC validation and
an installation wiring sheet that has not yet been released.

## Configuration

Create an enabled security sensor with a unique ID, `inputType: digital-gpio`,
`gpio: 4`, and `tamperGpio: -1`. Choose contact polarity:

| Setting | Contact to ground closed | Contact open |
| --- | --- | --- |
| normally-closed | inactive | active |
| normally-open | active | inactive |

The firmware applies the input configuration after successful setup/save and at
boot. Changes reset the debounce state. A configured separate tamper input is
reported `unsupported-tamper` until its driver is implemented. Wireless,
expander and bus inputs report `unsupported` in this local driver.

## Bench verification procedure

1. Keep mains, equipment controls and external powered sensors disconnected.
2. Complete authenticated setup and save the sensor configuration.
3. Request `GET /api/security/inputs` using the controller's bearer token over an
   isolated development network. Encrypted authenticated transport is still
   required before deployment; do not expose this development endpoint publicly.
4. Confirm an initial unavailable state becomes `ok` after sampling settles.
5. Open and close the contact, holding each state for more than 50 ms. Verify the
   active/inactive values against the polarity table.
6. Assign the same pin to a second item; both conflicting inputs must become
   unavailable rather than generating readings.
7. Change the GPIO to a reserved pin and confirm `reserved-pin` and `active: null`.
8. Reboot and repeat the physical contact test with the saved configuration.

Record firmware revision, board marking, exact contact model, supply voltage,
measured GPIO voltage for open/closed states and the observed results. These
physical checks have not been performed by the software test suite.

## Limitations

The endpoint explicitly reports `supervised: false` and
`alarmSystemCommissioned: false`. A simple contact cannot distinguish every
wire fault from a legitimate switch state. No arming logic, sounder control,
alarm certification, wireless heartbeat or end-of-line supervision is provided
by this driver. Existing independent life-safety alarms remain required.
