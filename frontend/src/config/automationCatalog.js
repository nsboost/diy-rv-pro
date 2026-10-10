import { temperatureSources } from './sensorInventory.js'

export function controlSystems(profile) {
  const systems = [{ id: 'notification', label: 'In-app / Browser Alert', category: 'Notifications', commands: ['sendAlert'], defaultCommand: 'sendAlert' }]
  for (const zone of (profile.hvacZones || []).filter(item => item.enabled && item.controlMode === 'controller')) {
    for (const [equipment, relay] of [['ac', 'coolRelay'], ['furnace', 'furnaceRelay'], ['heatPump', 'heatPumpRelay'], ['fan', 'fanRelay']]) {
      if (zone[relay] >= 0) systems.push({ id: `hvac.${zone.id}.${equipment}`, label: `${zone.label} · ${equipment}`, category: 'HVAC', commands: ['turnOn', 'turnOff', 'blockOn', 'blockOff', 'unblock'], defaultCommand: 'turnOff' })
    }
  }
  if ((profile.generators || []).some(item => item.enabled && item.controlStrategy !== 'monitor-only')) {
    systems.push({id: 'generator', label: 'Generator', category: 'Power Generation', commands: ['start', 'stop', 'blockOn', 'unblock'], defaultCommand: 'start'})
    systems.push({id: 'generator.autoStart', label: 'Generator Auto Start', category: 'Power Generation', commands: ['turnOn', 'turnOff', 'blockOn', 'unblock'], defaultCommand: 'blockOn'})
  }
  for (const heater of (profile.waterHeaters || []).filter(item => item.enabled && item.controlMode === 'controller')) {
    for (const [output, relay, label] of [['acElement','acElementRelay','AC heating element'], ['dcElement','dcElementRelay','DC heating element'], ['propane','propaneRelay','Propane heat'], ['recirculation','recircPumpRelay','Recirculation pump']]) {
      if (Number.isInteger(heater[relay]) && heater[relay] >= 0) systems.push({id:`device.waterHeaters.${heater.id}.${output}`, label:`${heater.label} · ${label}`, category:'Water Heaters', commands:['turnOn','turnOff','blockOn','blockOff','unblock'], defaultCommand:'turnOff'})
    }
  }
  for (const section of ['acBreakers', 'dcCircuits', 'waterPumps', 'inverters', 'customIo']) {
    for (const item of (profile[section] || []).filter(item => item.enabled && (item.controllable || item.controlMode === 'controller'))) {
      systems.push({id: `device.${section}.${item.id}`, label: item.label, category: ({acBreakers:'AC Circuits',dcCircuits:'DC Circuits',waterPumps:'Water Pumps',waterHeaters:'Water Heaters',inverters:'Power Conversion',customIo:'Custom I/O'})[section],
        commands: ['acBreakers', 'dcCircuits'].includes(section) ? ['open', 'close', 'blockOn', 'unblock'] : ['turnOn', 'turnOff', 'blockOn', 'blockOff', 'unblock'], defaultCommand: ['acBreakers', 'dcCircuits'].includes(section) ? 'open' : 'turnOff'})
    }
  }
  return systems
}

export function sourceCatalog(profile) {
  const sources = [['time.local', 'Local Time'], ...temperatureSources(profile)]
  const enabled = section => (profile[section] || []).some(item => item.enabled)
  if (enabled('batteries')) sources.push(['battery.voltage','Battery Voltage'], ['battery.stateOfCharge','Battery State of Charge'])
  if (enabled('solarChargeControllers')) sources.push(['solar.watts','Solar Generation Watts'], ['solar.voltage','Solar Array Voltage'])
  if (enabled('acBreakers') || enabled('dcCircuits')) sources.push(['loads.watts','Total Load Watts'])
  if (profile.rvProfile?.shorePower && profile.rvProfile.shorePower !== 'None') sources.push(['shorePower.connected','Shore Power Connected'])
  if (enabled('generators')) sources.push(['generator.running','Generator Running'])
  if (enabled('inverters')) sources.push(['inverter.mode','Inverter Mode'])
  for (const tank of (profile.waterTanks || []).filter(item => item.enabled)) sources.push([`tank.${tank.id}.level`, `${tank.label} Level`])
  for (const zone of (profile.hvacZones || []).filter(item => item.enabled)) sources.push([`hvac.${zone.id}.tempF`, `${zone.label} Temperature`])
  for (const system of controlSystems(profile).filter(item => item.id.startsWith('device.'))) sources.push([`${system.id}.state`, `${system.label} State`])
  return sources
}
