const now = new Date()

export const initialTelemetry = {
  controller: {
    name: 'DIY RV PRO',
    online: false,
    mode: 'simulation',
    firmware: 'v1.2.7',
    uptime: '5d 14h 22m',
    localIp: '192.168.4.1',
    alerts: 3
  },
  wifi: {
    mode: 'AP + Station',
    ssid: 'Campground-5G',
    strength: 'Strong',
    rssi: -48
  },
  time: {
    display: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString()
  },
  battery: {
    voltage: 13.34,
    current: -2.1,
    stateOfCharge: 26,
    temperatureF: 78.4,
    status: 'Discharging'
  },
  solar: {
    watts: 482,
    voltage: 31.5,
    current: 15.3,
    todayKwh: 2.45
  },
  loads: {
    watts: 823,
    voltage: 120,
    current: 6.9,
    totalKwh: 2.1
  },
  shorePower: {
    connected: true,
    voltage: 120,
    current: 30,
    quality: 'Good'
  },
  inverter: {
    mode: 'AC Pass Through',
    voltage: 120,
    frequencyHz: 60,
    efficiency: 93
  },
  weather: {
    temperatureF: 72,
    summary: 'Partly Cloudy',
    highF: 81,
    lowF: 61,
    humidity: 52,
    windMph: 6
  },
  generator: {
    running: false,
    runHours: 0,
    fuelType: 'Diesel',
    startMethod: '2-Wire',
    autoStart: true,
    nextStart: '--:--'
  },
  hvacZones: [
    {
      id: 'zone-1',
      name: 'HVAC - Zone 1',
      tempF: 72,
      setpointF: 72,
      coolSetpointF: 72,
      heatSetpointF: 66,
      autoDifferentialF: 3,
      sensorOffsetF: 0,
      mode: 'Cool',
      ac: true,
      furnace: false,
      heatPump: false,
      fan: false,
      auto: false
    },
    {
      id: 'zone-2',
      name: 'HVAC - Zone 2',
      tempF: 70,
      setpointF: 70,
      coolSetpointF: 70,
      heatSetpointF: 64,
      autoDifferentialF: 3,
      sensorOffsetF: -1,
      mode: 'Cool',
      ac: false,
      furnace: false,
      heatPump: true,
      fan: false,
      auto: false
    }
  ],
  tanks: [
    { id: 'fresh', label: 'Fresh', level: 68, used: 54, capacity: 80, unit: 'GAL', color: 'blue' },
    { id: 'gray', label: 'Gray', level: 42, used: 21, capacity: 50, unit: 'GAL', color: 'gray' },
    { id: 'black', label: 'Black', level: 28, used: 14, capacity: 50, unit: 'GAL', color: 'black' },
    { id: 'lp', label: 'LP Tank', level: 76, used: 14.2, capacity: 20, unit: 'GAL', color: 'gold' }
  ],
  automationRules: [
    {
      id: 'low-battery-generator',
      name: 'Low Battery Start Generator',
      detail: 'Battery < 12.0V for 5 min',
      enabled: true,
      trigger: {
        source: 'battery.voltage',
        label: 'Battery Voltage',
        operator: '<',
        value: '12.0',
        holdFor: '5 min'
      },
      action: {
        category: 'Power Generation',
        type: 'command',
        target: 'generator',
        targetLabel: 'Generator',
        command: 'start',
        commandLabel: 'Start',
        value: 'running'
      },
      reverse: {
        enabled: true,
        source: 'battery.voltage',
        operator: '>',
        value: '13.2',
        target: 'generator',
        targetLabel: 'Generator',
        command: 'stop',
        commandLabel: 'Stop',
        action: 'generator.stop'
      }
    },
    {
      id: 'gray-alert',
      name: 'High Gray Tank Alert',
      detail: 'Gray Tank > 80%',
      enabled: true,
      trigger: {
        source: 'tank.gray.level',
        label: 'Gray Tank Level',
        operator: '>',
        value: '80',
        holdFor: '0 min'
      },
      action: {
        category: 'Notifications',
        type: 'alert',
        target: 'notification',
        targetLabel: 'Alert / Notification',
        command: 'sendAlert',
        commandLabel: 'Send Alert / Notification',
        value: 'Gray tank level high'
      },
      reverse: {
        enabled: true,
        source: 'tank.gray.level',
        operator: '<',
        value: '70',
        target: 'notification',
        targetLabel: 'Alert / Notification',
        command: 'sendAlert',
        commandLabel: 'Send Alert / Notification',
        action: 'notification.sendAlert',
        restoreValue: 'Gray tank level back below alert threshold'
      }
    },
    {
      id: 'low-solar-shed-ac-breaker',
      name: 'Low Solar Shed AC Breaker',
      detail: 'Solar Generation Watts <= 250',
      enabled: true,
      trigger: {
        source: 'solar.watts',
        label: 'Solar Generation Watts',
        operator: '<=',
        value: '250',
        holdFor: '10 min'
      },
      action: {
        category: 'AC Breakers',
        type: 'state',
        target: 'breaker.ac.2',
        targetLabel: 'AC Breaker 2',
        command: 'open',
        commandLabel: 'Open / Shut Off Circuit',
        value: 'open'
      },
      reverse: {
        enabled: true,
        source: 'solar.watts',
        operator: '>',
        value: '700',
        target: 'breaker.ac.2',
        targetLabel: 'AC Breaker 2',
        command: 'close',
        commandLabel: 'Close / Restore Circuit',
        action: 'breaker.ac.2.close',
        restoreValue: 'closed'
      }
    },
    {
      id: 'zone-1-cool',
      name: 'HVAC - Zone 1 Cool',
      detail: 'Zone 1 Temp > 72F',
      enabled: true,
      trigger: {
        source: 'hvac.zone-1.tempF',
        label: 'Zone 1 Temperature',
        operator: '>',
        value: '72',
        holdFor: '1 min'
      },
      action: {
        category: 'HVAC',
        type: 'state',
        target: 'hvac.zone-1.ac',
        targetLabel: 'Zone 1 Air Conditioner',
        command: 'turnOn',
        commandLabel: 'Turn On',
        value: 'on'
      },
      reverse: {
        enabled: true,
        source: 'hvac.zone-1.tempF',
        operator: '<=',
        value: '70',
        target: 'hvac.zone-1.ac',
        targetLabel: 'Zone 1 Air Conditioner',
        command: 'turnOff',
        commandLabel: 'Turn Off',
        action: 'hvac.zone-1.ac.turnOff',
        restoreValue: 'off'
      }
    },
    {
      id: 'quiet-hours',
      name: 'Quiet Hours',
      detail: '10:00 PM - 7:00 AM',
      enabled: false,
      trigger: {
        source: 'time.local',
        label: 'Local Time',
        operator: 'between',
        value: '22:00-07:00',
        holdFor: '0 min'
      },
      action: {
        category: 'Power Generation',
        type: 'block',
        target: 'generator.autoStart',
        targetLabel: 'Generator Auto Start',
        command: 'blockOn',
        commandLabel: 'Block Turning On',
        value: 'on blocked'
      },
      reverse: {
        enabled: true,
        source: 'time.local',
        operator: 'outside',
        value: '22:00-07:00',
        target: 'generator.autoStart',
        targetLabel: 'Generator Auto Start',
        command: 'unblock',
        commandLabel: 'Remove Block',
        action: 'generator.autoStart.unblock',
        restoreValue: 'allowed'
      }
    }
  ],
  events: [
    { id: 1, time: '7:31 PM', type: 'success', message: 'Shore power connected' },
    { id: 2, time: '7:30 PM', type: 'success', message: 'Battery voltage normal' },
    { id: 3, time: '7:28 PM', type: 'warning', message: 'Gray tank level high' },
    { id: 4, time: '7:22 PM', type: 'success', message: 'Automation rule executed: Start AC1 (Zone 1)' },
    { id: 5, time: '7:15 PM', type: 'info', message: 'Firmware up to date' }
  ],
  systemStatus: [
    ['Battery Monitor', 'OK'],
    ['Solar Controller', 'OK'],
    ['Inverter', 'OK'],
    ['Water Sensors', 'OK'],
    ['HVAC System', 'OK'],
    ['Generator Module', 'OK']
  ],
  powerHistory: [
    { time: '12 PM', battery: 13.3, solar: 0, loads: 430 },
    { time: '1 PM', battery: 13.45, solar: 720, loads: 415 },
    { time: '2 PM', battery: 13.48, solar: 860, loads: 405 },
    { time: '3 PM', battery: 13.52, solar: 920, loads: 470 },
    { time: '4 PM', battery: 13.55, solar: 870, loads: 455 },
    { time: '5 PM', battery: 13.43, solar: 760, loads: 440 },
    { time: '6 PM', battery: 13.46, solar: 560, loads: 430 },
    { time: '9 PM', battery: 13.3, solar: 0, loads: 420 },
    { time: '12 AM', battery: 13.05, solar: 0, loads: 455 },
    { time: '3 AM', battery: 12.72, solar: 0, loads: 405 },
    { time: '6 AM', battery: 12.42, solar: 0, loads: 380 },
    { time: '9 AM', battery: 12.82, solar: 0, loads: 430 },
    { time: '10 AM', battery: 13.12, solar: 0, loads: 470 }
  ]
}

export const defaultConfig = {
  setupComplete: false,
  authRequired: true,
  apSsid: 'DIY-RV-PRO-SETUP',
  stationSsid: '',
  timezone: 'America/Denver',
  safeMode: true
}

export function cloneTelemetry() {
  return structuredClone(initialTelemetry)
}
