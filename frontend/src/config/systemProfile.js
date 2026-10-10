export const optionSets = {
  electricalService: ['30A', '50A', 'Dual 50A', '12V only', 'Custom'],
  shorePower: ['None', '15A adapter', '30A TT-30', '50A split phase', 'Dual input'],
  sensorTypes: ['disabled', 'resistive-0-90-ohm', 'resistive-0-180-ohm', 'capacitive', 'ultrasonic', 'pressure-transducer', 'digital', 'victron-ve.direct', 'modbus', 'canbus'],
  tempSensorTypes: ['disabled', 'ds18b20', 'ntc-10k', 'thermistor', 'ble', 'modbus', 'canbus'],
  communication: ['disabled', 'analog', 'digital-gpio', 'onewire', 'i2c', 'uart', 'modbus-rtu', 'canbus', 've.direct', 'bluetooth'],
  hvacEquipment: ['air-conditioner', 'furnace', 'heat-pump', 'fan-only', 'aquahot', 'hydronic', 'mini-split'],
  generatorFuel: ['gasoline', 'diesel', 'propane', 'dual-fuel', 'unknown'],
  generatorControl: ['monitor-only', 'two-wire', 'three-wire', 'momentary-start-stop', 'canbus', 'modbus', 'dry-contact'],
  confirmation: ['none', 'run-sense-gpio', 'rpm-input', 'voltage-detect', 'canbus', 'modbus'],
  inverterType: ['monitor-only', 'inverter', 'inverter-charger', 'charger-only'],
  waterHeaterType: ['tank-propane', 'tank-electric', 'tank-gas-electric', 'tankless-propane', 'tankless-electric', 'hydronic', 'aqua-hot'],
  waterControlMode: ['monitor-only', 'self-controlled', 'controller'],
  tankType: ['fresh', 'gray', 'black', 'galley', 'lp', 'fuel', 'aux', 'def'],
  breakerKind: ['main', 'branch', 'transfer', 'inverter-feed', 'charger', 'hvac', 'water-heater', 'receptacle', 'custom'],
  tempZoneKind: ['hvac', 'fridge', 'freezer', 'outdoor', 'basement', 'battery', 'generator', 'inverter', 'water-bay', 'custom'],
  cameraProtocol: ['snapshot', 'mjpeg', 'hls', 'webrtc', 'rtsp', 'onvif'],
  cameraRole: ['backup', 'entry', 'interior', 'exterior', 'blind-spot', 'hitch', 'pet-watch', 'security', 'custom'],
  securitySensorKind: ['door', 'window', 'motion-pir', 'motion-mmwave', 'glass-break', 'smoke', 'co', 'propane', 'water-leak', 'panic', 'heartbeat', 'presence', 'tamper', 'custom'],
  securityInput: ['digital-gpio', 'i2c-expander', 'ble', 'zigbee-gateway', 'zwave-gateway', 'wifi-mqtt', 'modbus', 'canbus', 'manual'],
  contactPolarity: ['normally-closed', 'normally-open']
}

export const configuratorSections = [
  { id: 'rvProfile', label: 'RV Profile' },
  { id: 'hvacZones', label: 'HVAC Zones' },
  { id: 'temperatureBuses', label: 'Temperature Buses' },
  { id: 'temperatureZones', label: 'Temperature Sensors' },
  { id: 'solarChargeControllers', label: 'Solar Controllers' },
  { id: 'inverters', label: 'Inverters / Chargers' },
  { id: 'batteries', label: 'Batteries' },
  { id: 'generators', label: 'Generators' },
  { id: 'acBreakers', label: 'AC Breakers' },
  { id: 'dcCircuits', label: 'DC Circuits' },
  { id: 'waterTanks', label: 'Water / Fluid Tanks' },
  { id: 'waterHeaters', label: 'Water Heaters' },
  { id: 'waterPumps', label: 'Water Pumps' },
  { id: 'propaneSystems', label: 'Propane / Fuel' },
  { id: 'weatherStations', label: 'Weather' },
  { id: 'cameras', label: 'Cameras' },
  { id: 'securityZones', label: 'Security Zones' },
  { id: 'securitySensors', label: 'Security Sensors' },
  { id: 'customIo', label: 'Custom I/O' }
]

export const defaultSystemProfile = {
  schemaVersion: 1,
  rvProfile: {
    name: 'Unconfigured RV',
    rvType: 'Class A',
    lengthFt: 0,
    electricalService: '50A',
    shorePower: '50A split phase'
  },
  features: {
    hvac: false,
    power: false,
    solar: false,
    generator: false,
    water: false,
    tanks: false,
    temperatureMonitoring: false,
    automation: false,
    cameras: false,
    security: false
  },
  hvacZones: [],
  temperatureBuses: [],
  temperatureZones: [],
  solarChargeControllers: [],
  inverters: [],
  batteries: [],
  generators: [],
  acBreakers: [],
  dcCircuits: [],
  waterTanks: [],
  waterHeaters: [],
  waterPumps: [],
  propaneSystems: [],
  weatherStations: [],
  cameras: [],
  securityZones: [],
  securitySensors: [],
  customIo: []
}

const nextId = () => Array.from(
  globalThis.crypto.getRandomValues(new Uint8Array(16)),
  value => value.toString(16).padStart(2, '0')
).join('')

export function createProfileItem(sectionId, count = 0) {
  const id = nextId()

  const base = {
    id,
    label: `${configuratorSections.find(section => section.id === sectionId)?.label || 'Item'} ${count + 1}`,
    enabled: true
  }

  const factories = {
    hvacZones: () => ({
      ...base,
      type: 'ducted-zone',
      equipment: ['air-conditioner'],
      stageCount: 1,
      controlMode: 'controller',
      temperatureSensorId: '',
      tempSensorGpio: -1,
      coolRelay: -1,
      furnaceRelay: -1,
      heatPumpRelay: -1,
      fanRelay: -1
    }),
    temperatureBuses: () => ({ ...base, type: 'onewire', gpio: -1 }),
    temperatureZones: () => ({
      ...base,
      type: 'fridge',
      sensorType: 'ds18b20',
      busId: '',
      address: '',
      tempSensorGpio: -1,
      lowAlarmF: 34,
      highAlarmF: 42
    }),
    solarChargeControllers: () => ({
      ...base,
      type: 'mppt',
      communication: 've.direct',
      sensorType: 'disabled',
      maxCurrentA: 50,
      adcChannel: -1,
      senseGpio: -1
    }),
    inverters: () => ({
      ...base,
      type: 'inverter-charger',
      communication: 'canbus',
      sensorType: 'disabled',
      maxCurrentA: 100,
      adcChannel: -1,
      senseGpio: -1
    }),
    batteries: () => ({
      ...base,
      type: 'lithium',
      communication: 'canbus',
      sensorType: 'disabled',
      capacityAh: 200,
      adcChannel: -1,
      senseGpio: -1
    }),
    generators: () => ({
      ...base,
      fuelType: 'diesel',
      controlStrategy: 'two-wire',
      confirmationStrategy: 'run-sense-gpio',
      startRelay: -1,
      stopRelay: -1,
      runSenseGpio: -1,
      rpmInputGpio: -1,
      maxCrankSeconds: 10,
      warmupSeconds: 30,
      cooldownSeconds: 60
    }),
    acBreakers: () => ({
      ...base,
      type: 'branch',
      ratingA: 15,
      monitored: true,
      controllable: false,
      relay: -1,
      senseGpio: -1
    }),
    dcCircuits: () => ({
      ...base,
      type: 'branch',
      ratingA: 15,
      monitored: true,
      controllable: false,
      relay: -1,
      senseGpio: -1
    }),
    waterTanks: () => ({
      ...base,
      type: 'fresh',
      sensorType: 'resistive-0-180-ohm',
      capacityGal: 50,
      adcChannel: -1,
      emptyMv: 0,
      fullMv: 3300
    }),
    waterHeaters: () => ({
      ...base,
      type: 'tank-gas-electric',
      controlMode: 'self-controlled',
      hasAcElement: true,
      hasDcElement: false,
      hasPropane: true,
      tankless: false,
      recircPump: false,
      acElementRelay: -1,
      dcElementRelay: -1,
      propaneRelay: -1,
      recircPumpRelay: -1,
      temperatureSensorId: '',
      tempSensorGpio: -1
    }),
    waterPumps: () => ({
      ...base,
      type: 'fresh-water',
      controlMode: 'controller',
      relay: -1,
      senseGpio: -1
    }),
    propaneSystems: () => ({
      ...base,
      type: 'lp-tank',
      sensorType: 'pressure-transducer',
      adcChannel: -1,
      senseGpio: -1
    }),
    weatherStations: () => ({
      ...base,
      type: 'outdoor',
      communication: 'i2c',
      sensorType: 'digital',
      temperatureSensorId: '',
      tempSensorGpio: -1
    }),
    cameras: () => ({
      ...base,
      type: 'exterior',
      role: 'security',
      protocol: 'webrtc',
      streamUrl: '',
      snapshotUrl: '',
      gatewayName: '',
      requiresAuth: true,
      recordMotion: false
    }),
    securityZones: () => ({
      ...base,
      type: 'perimeter',
      armHome: true,
      armAway: true,
      entryDelaySeconds: 30,
      exitDelaySeconds: 45
    }),
    securitySensors: () => ({
      ...base,
      type: 'door',
      zoneId: '',
      inputType: 'digital-gpio',
      contactPolarity: 'normally-closed',
      gpio: -1,
      expanderAddress: -1,
      expanderPin: -1,
      tamperGpio: -1,
      heartbeatSeconds: 0,
      lowBattery: false
    }),
    customIo: () => ({
      ...base,
      type: 'digital-input',
      controlMode: 'monitor-only',
      gpio: -1,
      relay: -1
    })
  }

  return factories[sectionId]?.() || base
}

export function normalizeSystemProfile(profile) {
  const merged = structuredClone(defaultSystemProfile)
  const source = profile && typeof profile === 'object' ? profile : {}

  merged.schemaVersion = 1
  merged.rvProfile = { ...merged.rvProfile, ...(source.rvProfile || {}) }
  merged.features = { ...merged.features, ...(source.features || {}) }

  configuratorSections.forEach(section => {
    if (Array.isArray(merged[section.id])) {
      merged[section.id] = Array.isArray(source[section.id]) ? structuredClone(source[section.id]) : []
    }
  })

  return merged
}

export function summarizeProfile(profile) {
  const normalized = normalizeSystemProfile(profile)
  return configuratorSections
    .filter(section => Array.isArray(normalized[section.id]))
    .map(section => [section.label, normalized[section.id].filter(item => item.enabled).length, normalized[section.id].length])
}
