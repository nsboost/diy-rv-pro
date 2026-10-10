import { defaultSystemProfile } from '../config/systemProfile.js'

function rom(serial) {
  const bytes = [0x28, serial, 0, 0, 0, 0, 0]
  let crc = 0
  for (let value of bytes) for (let i = 0; i < 8; i++) {
    const mix = (crc ^ value) & 1; crc >>= 1; if (mix) crc ^= 0x8c; value >>= 1
  }
  return [...bytes, crc].map(value => value.toString(16).padStart(2, '0')).join('')
}

export const demoProfile = {
  ...structuredClone(defaultSystemProfile),
  rvProfile: { ...defaultSystemProfile.rvProfile, name: 'Demo RV' },
  temperatureBuses: [{ id: 'demo-bus', label: 'Cabin temperature bus', enabled: true, type: 'onewire', gpio: 4 }],
  temperatureZones: [1, 2].map((number, index) => ({
    id: `demo-temp-${number}`, label: index ? 'Bedroom' : 'Living Room', enabled: true,
    type: 'hvac', sensorType: 'ds18b20', busId: 'demo-bus', address: rom(number),
    tempSensorGpio: -1, lowAlarmF: 40, highAlarmF: 95
  })),
  hvacZones: [1, 2].map(number => ({ id: `zone-${number}`, label: number === 1 ? 'Living Room HVAC' : 'Bedroom HVAC',
    enabled: true, type: 'ducted-zone', equipment: [number === 1 ? 'air-conditioner' : 'heat-pump'], stageCount: 1,
    controlMode: 'controller', temperatureSensorId: `demo-temp-${number}`, tempSensorGpio: -1,
    coolRelay: number === 1 ? 0 : -1, furnaceRelay: -1, heatPumpRelay: number === 2 ? 1 : -1, fanRelay: -1 })),
  batteries: [{id:'demo-battery',label:'House Battery',enabled:true,type:'lithium',communication:'canbus',sensorType:'disabled',capacityAh:200,adcChannel:-1,senseGpio:-1}],
  solarChargeControllers: [{id:'demo-solar',label:'Solar Controller',enabled:true,type:'mppt',communication:'ve.direct',sensorType:'disabled',maxCurrentA:50,adcChannel:-1,senseGpio:-1}],
  inverters: [{id:'demo-inverter',label:'Inverter Charger',enabled:true,type:'inverter-charger',communication:'canbus',sensorType:'disabled',maxCurrentA:100,adcChannel:-1,senseGpio:-1}],
  acBreakers: [{id:'demo-ac1',label:'AC Circuit 1',enabled:true,type:'branch',ratingA:15,monitored:true,controllable:true,relay:3,senseGpio:-1}],
  generators: [{ id: 'demo-generator', label: 'Generator', enabled: true, controlStrategy: 'two-wire', fuelType: 'diesel',
    startRelay: 2, stopRelay: -1, runSenseGpio: -1, rpmInputGpio: -1, confirmationStrategy: 'none', maxCrankSeconds: 10, warmupSeconds: 30, cooldownSeconds: 60 }],
  waterTanks: ['fresh', 'gray', 'black', 'lp'].map(type => ({ id: type, label: type === 'lp' ? 'LP Tank' : `${type[0].toUpperCase()}${type.slice(1)}`,
    enabled: true, type, capacityGal: type === 'fresh' ? 80 : type === 'lp' ? 20 : 50, sensorType: 'digital', adcChannel: -1, emptyMv: 0, fullMv: 3300 }))
}

export function demoReadings(now = Date.now()) {
  return demoProfile.temperatureZones.map((sensor, index) => ({ id: sensor.id, address: sensor.address, tempF: index ? 70 : 72, sampledAt: now, status: 'ok' }))
}
