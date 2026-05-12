# ARCHITECTURE

## High Level Structure

```text
Frontend (React/Vite)
        ↓
Backend Bridge/API
        ↓
ESP32-C3 Firmware
```

## Frontend
Responsibilities:
- Dashboard UI
- Setup wizard
- Automation editor
- Historical telemetry
- System configuration
- Touchscreen/web UI

## Backend
Responsibilities:
- WebSocket bridge
- Persistent configuration
- API layer
- OTA coordination
- Future cloud integration

## Firmware
Responsibilities:
- Hardware abstraction
- Automation execution
- Sensor polling
- Failsafe logic
- Generator control
- HVAC control
- Tank monitoring
- Network communication

## Configuration Driven Design
System behavior derives from:

```js
systemConfig
```

This allows:
- Dynamic UI rendering
- Universal RV compatibility
- Modular hardware support

## Planned Firmware Structure
```text
firmware/
├── core/
├── services/
├── drivers/
├── automation/
├── networking/
├── storage/
└── safety/
```
