import { resolveTemperature } from '../config/sensorInventory.js'

export function projectTelemetry(snapshot, profile, now = Date.now()) {
  const telemetry = structuredClone(snapshot)
  const temperatures = (profile.temperatureZones || []).filter(item => item.enabled).map(sensor => ({
    id: sensor.id, label: sensor.label, address: sensor.address, sampledAt: snapshot.temperatures?.find(item => item.id === sensor.id)?.sampledAt,
    ...resolveTemperature(sensor, snapshot.temperatures, now)
  }))
  telemetry.temperatures = temperatures
  telemetry.hvacZones = (profile.hvacZones || []).filter(item => item.enabled).map(zone => {
    const reading = temperatures.find(sensor => sensor.id === zone.temperatureSensorId)
    const original = snapshot.hvacZones.find(item => item.id === zone.id)
    return { id: zone.id, name: zone.label, setpointF: 72, coolSetpointF: 72, heatSetpointF: 66,
      autoDifferentialF: 3, sensorOffsetF: 0, mode: 'Off', ac: false, heatPump: false, furnace: false, fan: false, auto: false,
      ...original, controlMode: zone.controlMode, availableEquipment: ['ac','furnace','heatPump','fan'].filter(key => zone[({ac:'coolRelay',furnace:'furnaceRelay',heatPump:'heatPumpRelay',fan:'fanRelay'})[key]] >= 0), name: zone.label, tempF: reading?.tempF ?? null, sensorStatus: reading?.status || 'unassigned',
      sensorLabel: reading?.label || 'No sensor assigned', temperatureSensorId: zone.temperatureSensorId }
  })
  telemetry.tanks = (profile.waterTanks || []).filter(item => item.enabled).map(tank => {
    const reading = snapshot.tanks.find(item => item.id === tank.id)
    return { id: tank.id, label: tank.label, capacity: tank.capacityGal, unit: 'GAL', color: 'blue',
      level: null, used: null, ...reading, label: tank.label, capacity: tank.capacityGal }
  })
  const installed = section => (profile[section] || []).some(item => item.enabled)
  const clear = key => { telemetry[key] = Object.fromEntries(Object.entries(telemetry[key] || {}).map(([field,value]) => [field, value === null || typeof value === 'number' || typeof value === 'boolean' ? null : 'Not configured'])) }
  for (const [section,key] of [['batteries','battery'],['solarChargeControllers','solar'],['inverters','inverter'],['weatherStations','weather']]) if (!installed(section)) clear(key)
  if (!installed('acBreakers') && !installed('dcCircuits')) clear('loads')
  telemetry.generator = { ...telemetry.generator, configured: installed('generators'), controllable: (profile.generators || []).some(item => item.enabled && item.controlStrategy !== 'monitor-only') }
  if (!telemetry.generator.configured) { clear('generator'); telemetry.generator.configured = false; telemetry.generator.controllable = false }
  if (!installed('batteries') && !installed('solarChargeControllers') && !installed('acBreakers') && !installed('dcCircuits')) telemetry.powerHistory = []
  const simulated = snapshot.controller.mode === 'simulation' || snapshot.controller.equipmentMode === 'prototype-simulation'
  telemetry.systemStatus = [['Battery Monitor','batteries'],['Solar Controller','solarChargeControllers'],['Inverter','inverters'],['Water Sensors','waterTanks'],['HVAC System','hvacZones'],['Generator Module','generators']].map(([label,section]) => [label, installed(section) ? simulated ? 'Demo' : snapshot.controller.online ? 'Configured' : 'Offline' : 'Not configured'])
  return telemetry
}
