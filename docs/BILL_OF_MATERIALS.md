# Bill of materials and substitution matrix

Revision: engineering baseline, 2026-09-30. Not yet a released installation BOM.

This list covers the intended product scope. Only the ESP32-S3 N8 firmware build
is currently verified. A component listed below is not automatically supported
by firmware. Unselected assemblies require an exact part number, schematic,
driver and bench verification before purchase for a customer installation.
Prices and stock are intentionally not asserted.

## Core assembly

| ID | Item / candidate | Quantity | Requirement / substitution conditions | Status |
| --- | --- | --- | --- | --- |
| CORE-01 | Espressif ESP32-S3-DevKitC-1-N8 | 1 | Current 8 MB flash/no-PSRAM build profile; verify physical module marking | Build verified; bench pending |
| CORE-02 | PSRAM-equipped ESP32-S3 Ethernet board | Alternative to CORE-01 | Candidate: Waveshare ESP32-S3-ETH, 16 MB flash/8 MB PSRAM. Requires separate pin, Ethernet, memory and partition profile; not a drop-in firmware substitution | Evaluation candidate |
| CORE-03 | Protected DC/DC power assembly | 1 per powered node | Input range must cover installation supply and specified transients; reverse-polarity protection, undervoltage behavior, thermal rating and output capacity must be documented | Part selection pending |
| CORE-04 | Fuse holder, fuse and branch disconnect | 1 set per separately fed node | Fuse chosen for wire ampacity, converter/inrush and fault current; no universal fuse value | Installation-specific |
| CORE-05 | Enclosure and mounting hardware | 1 per node | Strain relief, service access, terminal protection, ambient temperature and moisture rating matched to location | Selection pending |
| CORE-06 | Terminal blocks, ferrules, cable glands, labels and wire | Per circuit schedule | Wire gauge from current, voltage drop, length and environment; preserve signal/power separation | Installation-specific |
| CORE-07 | USB data cable and regulated bench supply | 1 development set | Match board connectors; avoid simultaneous power paths unless board documentation permits them | Required for bench setup |
| CORE-08 | Browser-capable phone/tablet/computer | 1 or more | Current React UI requires a browser. A bare ESP32 LCD is not an interchangeable browser display | Existing device may be used |
| CORE-09 | Local network equipment | As needed | Wi-Fi or Ethernet depends on selected board; local operation must not depend on Internet access | Architecture-dependent |

## Temperature monitoring

| ID | Sensor / interface | Quantity rule | Configuration and substitution conditions | Status |
| --- | --- | --- | --- | --- |
| TEMP-01 | Analog Devices DS18B20, externally powered | One per measured location | Store individual 64-bit identity and assigned zone. Enclosed probes must have documented pinout, cable/environment ratings and genuine device specification | Driver/bench pending |
| TEMP-02 | 1-Wire pull-up and protected connection assembly | One per bus segment | Select pull-up and topology for measured bus capacitance; use 3.3 V logic with this controller. Do not assume wire colors identify terminals | Circuit verification pending |
| TEMP-03 | NTC thermistor and precision reference resistor | One set per analog point | Specify resistance at reference temperature, beta/curve coefficients, reference resistor, ADC circuit and open/short limits; "10k" alone is insufficient | Alternative; pending |
| TEMP-04 | Industrial digital temperature transmitter | One per point or multi-channel node | Specify protocol, supply, address/register map, units and timeout. RS-485/CAN requires the matching protected interface | Alternative; pending |

Use temperature ratings suitable for the measured surface or air. A cabin probe
is not an exhaust-gas probe. Fridge/freezer, outdoor, battery, generator and
inverter temperatures require different mounting and environmental choices.

## Tanks and fluid levels

| ID | Sensor / interface | Quantity rule | Configuration and substitution conditions | Status |
| --- | --- | --- | --- | --- |
| TANK-01 | Resistive level sender, specified range | One per tank | 0-90 ohm and 0-180 ohm require their own measured calibration and excitation/interface design. Determine direction of response; do not connect in parallel with an existing gauge without checking loading | Pending |
| TANK-02 | Capacitive level sensor | Alternative per tank | Check tank wall material/thickness, fluid compatibility, output type and power. "Capacitive" does not specify its electrical output | Pending |
| TANK-03 | Ultrasonic level sensor | Alternative per tank | Verify blind zone, mounting clearance, condensation/foam behavior, tank geometry and voltage/protocol | Pending |
| TANK-04 | Pressure level transmitter | Alternative per tank | Match pressure range to fluid head and density; verify wetted materials, venting and electrical output | Pending |
| TANK-05 | Current-loop receiver | One per 4-20 mA transmitter | Receiver/shunt rating, protection, common-mode limits and isolation matched to transmitter; distinguish fault current from empty/full | Pending |
| TANK-06 | Protected analog acquisition assembly using TI ADS1115 | ceil(compatible single-ended points / 4), subject to circuit design | Four single-ended inputs per ADC; input voltage must remain within specified limits regardless of programmable gain. Different signal types need different conditioning | Candidate; pending |

Fresh, gray, black, galley, fuel and other tanks are separate identities, with
their own capacity, geometry/calibration curve, alarm thresholds and stale-data
timeout. Fuel/propane sensors require equipment-specific approval; water-level
parts are not substitutes merely because their electrical range matches.

## Electrical monitoring and control

| ID | Item / interface | Quantity rule | Configuration and substitution conditions | Status |
| --- | --- | --- | --- | --- |
| PWR-01 | Battery shunt/monitor | Per separately measured bank | Rated current, continuous/peak limits, polarity, installation location and communications must match the bank | Model selection pending |
| PWR-02 | Isolated VE.Direct interface | Per VE.Direct device | Manufacturer recommends isolated interfaces. A USB or RS232 adapter also needs a compatible host or transceiver; neither connects directly to ESP GPIO | Protocol integration pending |
| PWR-03 | Isolated RS-485 transceiver assembly | Per bus/node design | Device register map, baud/parity, addresses, termination and biasing documented per network | Pending |
| PWR-04 | CAN transceiver assembly | Per CAN node | Match bus electrical specification, bitrate, termination and equipment protocol; CAN wiring alone does not supply an inverter/BMS protocol | Pending |
| PWR-05 | Isolated AC metering module and matched current sensors | Per measured feed/branch | Match phase arrangement, voltage/current ratings, CT type and installation instructions. No mains voltage may reach ESP/ADC terminals | Model selection pending |
| PWR-06 | Rated contactor/interface relay and driver | Per controlled circuit | Contact ratings must cover load type and inrush, coil supply and suppression. GPIO is not a coil driver; module nameplate ratings are not an installed-system rating | Pending |

Solar controllers, inverters, inverter-chargers and chargers each need explicit
manufacturer/model/firmware support. VE.Direct, VE.Bus, CAN and Modbus are not
interchangeable. Monitoring a breaker does not make an ordinary breaker remotely
operable. Retain protective breakers and approved transfer/interlock equipment.

## HVAC, generator and water systems

| ID | Item / interface | Quantity rule | Configuration and substitution conditions | Status |
| --- | --- | --- | --- | --- |
| CTRL-01 | HVAC low-voltage interface harness | Per HVAC zone/controller | Equipment wiring diagram, heat/cool/fan/stages, heat-pump reversing-valve behavior, feedback and manual override; proprietary thermostat buses need dedicated adapters | Pending |
| CTRL-02 | Generator remote-control harness | Per generator | Exact generator model; two-wire, three-wire or momentary start/stop; pulse timing, feedback polarity and stop behavior | Pending |
| CTRL-03 | Isolated run/voltage/RPM feedback assembly | Per selected confirmation signal | Voltage and pulse ranges, pulses/revolution, timeout and filtering; do not use unsupervised assumptions as run confirmation | Pending |
| CTRL-04 | Water-heater enable/monitor harness | Per heater | Self-controlled vs controller-requested operation; tank/tankless, AC/DC elements, propane/hydronic, feedback and OEM limits | Pending |
| CTRL-05 | Pump/recirculation interface and feedback | Per pump | Pump voltage/current/inrush, dry-run protection, maximum run time, flow/pressure feedback and manual operation | Pending |
| CTRL-06 | Leak/flow/pressure sensors | Per protected area/loop | Match wet location, fluid, pulse/analog/contact interface, scaling and thresholds | Optional; pending |

Manufacturer limit switches, flame safeguards, thermal cutouts and native
protection remain functional. The controller must not bypass them. Harnesses
cannot be generalized across equipment models without documented compatibility.

## Optional security expansion

| ID | Item / candidate | Quantity rule | Configuration and substitution conditions | Status |
| --- | --- | --- | --- | --- |
| SEC-01 | Waveshare ESP32-S3-ETH-8DI-8RO node | ceil(required compatible digital channels / 8) | Reserve channels for separate tamper signals. Ethernet/RS-485 interfaces and enclosure variant must match installation; custom enrollment firmware still required | Evaluation candidate |
| SEC-02 | Magnetic door/window contact | Per opening | NC/NO behavior, mounting gap, environment and tamper requirements | Pending |
| SEC-03 | PIR detector with documented alarm contact | Per coverage area | Supply, alarm contact rating, warmup, power-loss behavior and tamper contact | Pending |
| SEC-04 | mmWave presence detector | Alternative per coverage area | A relay-output device differs from a UART/BLE module; requires matching driver and occupancy tuning | Pending |
| SEC-05 | Supervised input receiver and end-of-line resistors | Per supervised loop | Values and placement selected with receiver; discriminate normal/alarm/open/short. Plain digital inputs do not provide full loop supervision | Pending |
| SEC-06 | Wireless gateway and compatible sensors | Per protocol/network | Zigbee, Z-Wave, BLE and Wi-Fi are distinct integrations; require authenticated enrollment, battery state and heartbeat handling | Optional; pending |
| SEC-07 | Sounder/strobe interface and protected supply | Per installation | Current, tamper behavior, arming rules and nuisance alarm handling | Optional; pending |
| SEC-08 | Microchip MCP23017 local I/O assembly | Alternative inside enclosure | I2C GPIO expansion requires protection/conditioning; not a direct substitute for a remote isolated node. Check silicon revision and input restrictions | Evaluation candidate |

Smoke, CO and propane detection must retain independent, appropriately rated
alarms. Any auxiliary monitoring must use a manufacturer-supported interface.
Security expansion may be fitted later; it must not require replacing the saved
HVAC/water/power configuration.

## Ordering and substitution record

Before a row becomes released, record: manufacturer, complete part number,
hardware revision, supplier link, quantity, ratings, pinout reference, firmware
driver/version, test report and allowed alternatives. An alternative is accepted
only after checking supply, logic levels, connector, calibration, environmental
rating, protocol and fault behavior. Recommission affected points after a change.

## Primary references

- [DS18B20 manufacturer page](https://www.analog.com/en/products/DS18B20.html)
- [DS18B20 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf)
- [ADS1115 manufacturer page](https://www.ti.com/product/ADS1115)
- [MCP23017 manufacturer page](https://www.microchip.com/en-us/product/mcp23017)
- [VE.Direct electrical interface guidance](https://www.victronenergy.com/live/vedirect_protocol:faq)
- [ESP32-S3 Ethernet board](https://docs.waveshare.com/ESP32-S3-ETH)
- [Eight-input expansion board](https://www.waveshare.com/wiki/ESP32-S3-ETH-8DI-8RO)

References identify candidate parts and interface requirements, not completed
integration. Camera and streaming-audio parts are outside the current release.
