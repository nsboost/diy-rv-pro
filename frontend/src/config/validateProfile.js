import { validateSensorInventory } from './sensorInventory.js'
import { optionSets } from './systemProfile.js'

export const sectionLimits = { temperatureBuses: 4, hvacZones: 8, temperatureZones: 32, solarChargeControllers: 8, inverters: 6, batteries: 8, generators: 2, acBreakers: 48, dcCircuits: 64, waterTanks: 12, waterHeaters: 4, waterPumps: 8, propaneSystems: 4, weatherStations: 2, cameras: 8, securityZones: 16, securitySensors: 64, customIo: 64 }

export function validateProfile(profile) {
  const errors = validateSensorInventory(profile)
  const ids = new Set()
  const relays = new Map()
  if (profile.schemaVersion !== 1) errors.push('Unsupported configuration version')
  if (!profile.rvProfile?.name?.trim() || profile.rvProfile.name.length > 48) errors.push('RV name must contain 1–48 characters')
  for (const [section, limit] of Object.entries(sectionLimits)) {
    const items = profile[section]
    if (!Array.isArray(items)) { errors.push(`${section}: expected an inventory list`); continue }
    if (items.length > limit) errors.push(`${section}: maximum ${limit} items`)
    for (const item of items) {
      if (!item || typeof item !== 'object') { errors.push(`${section}: invalid item`); continue }
      if (typeof item.id !== 'string' || !item.id || item.id.length > 32 || ids.has(item.id)) errors.push(`${section}: missing or duplicate item identity`)
      ids.add(item.id)
      if (!item.label?.trim() || item.label.length > 48) errors.push(`${section}: labels must contain 1–48 characters`)
      for (const [key, value] of Object.entries(item)) {
        if (/Gpio$|^gpio$|^adcChannel$/.test(key) && (!Number.isInteger(value) || value < -1 || value > 48)) errors.push(`${item.label}: ${key} must be an integer from -1 to 48`)
        if (/Relay$|^relay$/.test(key)) {
          if (!Number.isInteger(value) || value < -1 || value > 63) errors.push(`${item.label}: invalid relay channel`)
          if (item.enabled && value >= 0) {
            if (relays.has(value)) errors.push(`${item.label}: relay ${value} is already used by ${relays.get(value)}`)
            relays.set(value, item.label)
          }
        }
      }
      if (!item.enabled) continue
      if (section === 'generators') {
        if (!optionSets.generatorControl.includes(item.controlStrategy)) errors.push(`${item.label}: unsupported generator strategy`)
        if (['two-wire', 'three-wire', 'momentary-start-stop', 'dry-contact'].includes(item.controlStrategy) && item.startRelay < 0) errors.push(`${item.label}: assign a start relay`)
        if (['three-wire', 'momentary-start-stop'].includes(item.controlStrategy) && item.stopRelay < 0) errors.push(`${item.label}: assign a stop relay`)
      }
      if (section === 'hvacZones' && item.controlMode === 'controller' && !['coolRelay', 'furnaceRelay', 'heatPumpRelay', 'fanRelay'].some(key => item[key] >= 0)) errors.push(`${item.label}: assign an equipment relay`)
      if (['acBreakers', 'dcCircuits'].includes(section) && item.controllable && item.relay < 0) errors.push(`${item.label}: controllable circuits require a relay`)
      if (section === 'securitySensors' && item.zoneId && !(profile.securityZones || []).some(zone => zone.enabled && zone.id === item.zoneId)) errors.push(`${item.label}: select an enabled security zone`)
      if (section === 'waterTanks' && (!(item.capacityGal > 0) || item.emptyMv === item.fullMv)) errors.push(`${item.label}: enter positive capacity and distinct empty/full calibration`)
    }
  }
  return [...new Set(errors)]
}
