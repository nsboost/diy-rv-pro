import { validateSensorInventory } from './sensorInventory.js'
import { optionSets } from './systemProfile.js'

export const sectionLimits = { temperatureBuses: 4, hvacZones: 8, temperatureZones: 32, solarChargeControllers: 8, inverters: 6, batteries: 8, generators: 2, acBreakers: 48, dcCircuits: 64, waterTanks: 12, waterHeaters: 4, waterPumps: 8, propaneSystems: 4, weatherStations: 2, cameras: 8, securityZones: 16, securitySensors: 64, customIo: 64 }
const powerRanges = { maxCurrentA: [0, 500], capacityAh: [0, 2000] }
const utf8Length = value => new TextEncoder().encode(value).length
// Keep optional inventory text fields aligned with feature_config.c storage bounds.
const textLimits = { type:32, controlMode:32, temperatureSensorId:32, busId:32, address:16, sensorType:32, communication:32, inputType:32, contactPolarity:32, zoneId:32, role:32, protocol:32, gatewayName:48, streamUrl:256, snapshotUrl:256 }
const booleanFields = ['monitored', 'controllable', 'hasAcElement', 'hasDcElement', 'hasPropane', 'tankless', 'recircPump', 'requiresAuth', 'recordMotion', 'armHome', 'armAway', 'lowBattery']
const assigned = value => Number.isInteger(value) && value >= 0
const configuredText = value => typeof value === 'string' && value.trim() !== '' && value !== 'disabled'
const numericRanges = {
  hvacZones: { stageCount: [0, 4] },
  generators: { maxCrankSeconds: [1, 30], warmupSeconds: [0, 600], cooldownSeconds: [0, 600] },
  waterTanks: { capacityGal: [0, 500], emptyMv: [0, 3300], fullMv: [0, 3300] },
  acBreakers: { ratingA: [0, 100] }, dcCircuits: { ratingA: [0, 100] },
  batteries: powerRanges, inverters: powerRanges, solarChargeControllers: powerRanges,
  temperatureZones: { lowAlarmF: [-40, 250], highAlarmF: [-40, 250] },
  securityZones: { entryDelaySeconds: [0, 600], exitDelaySeconds: [0, 600] },
  securitySensors: { expanderAddress: [-1, 127], expanderPin: [-1, 31], heartbeatSeconds: [0, 86400] }
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return ['Configuration must be an object']
  const structureErrors = []
  if (typeof profile.rvProfile?.name !== 'string') structureErrors.push('RV name must be text')
  for (const section of Object.keys(sectionLimits)) {
    if (!Array.isArray(profile[section])) { structureErrors.push(`${section}: expected an inventory list`); continue }
    for (const item of profile[section]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { structureErrors.push(`${section}: invalid item`); continue }
      if (typeof item.label !== 'string') structureErrors.push(`${section}: labels must be text`)
      if (typeof item.enabled !== 'boolean') structureErrors.push(`${section}: enabled must be true or false`)
      for (const key of booleanFields) {
        if (item[key] !== undefined && typeof item[key] !== 'boolean') structureErrors.push(`${section}: ${key} must be true or false`)
      }
      for (const [key, limit] of Object.entries(textLimits)) {
        if (item[key] !== undefined && (typeof item[key] !== 'string' || utf8Length(item[key]) > limit)) structureErrors.push(`${section}: ${key} must be text using at most ${limit} UTF-8 bytes`)
      }
    }
  }
  if (structureErrors.length) return [...new Set(structureErrors)]
  const errors = validateSensorInventory(profile)
  const ids = new Set()
  const relays = new Map()
  if (profile.schemaVersion !== 1) errors.push('Unsupported configuration version')
  if (!profile.rvProfile?.name?.trim() || utf8Length(profile.rvProfile.name) > 48) errors.push('RV name must contain text using at most 48 UTF-8 bytes')
  if (!Number.isFinite(profile.rvProfile.lengthFt) || profile.rvProfile.lengthFt < 0 || profile.rvProfile.lengthFt > 60) errors.push('RV length must be a number from 0 to 60 feet')
  for (const [section, limit] of Object.entries(sectionLimits)) {
    const items = profile[section]
    if (!Array.isArray(items)) { errors.push(`${section}: expected an inventory list`); continue }
    if (items.length > limit) errors.push(`${section}: maximum ${limit} items`)
    for (const item of items) {
      if (!item || typeof item !== 'object') { errors.push(`${section}: invalid item`); continue }
      if (typeof item.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(item.id) || ['constructor', 'prototype'].includes(item.id) || ids.has(item.id)) errors.push(`${section}: invalid or duplicate item identity; use 1–32 letters, digits, hyphens or underscores, beginning with a letter or digit`)
      ids.add(item.id)
      if (!item.label?.trim() || utf8Length(item.label) > 48) errors.push(`${section}: labels must contain text using at most 48 UTF-8 bytes`)
      for (const [key, [min, max]] of Object.entries(numericRanges[section] || {})) {
        if (item[key] !== undefined && (!Number.isInteger(item[key]) || item[key] < min || item[key] > max)) errors.push(`${item.label}: ${key} must be an integer from ${min} to ${max}`)
      }
      if (section === 'hvacZones' && !['monitor-only', 'self-controlled', 'controller'].includes(item.controlMode)) errors.push(`${item.label}: unsupported HVAC control mode`)
      if (section === 'generators' && !optionSets.generatorControl.includes(item.controlStrategy)) errors.push(`${item.label}: unsupported generator strategy`)
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
        if (['two-wire', 'three-wire', 'momentary-start-stop', 'dry-contact'].includes(item.controlStrategy) && !assigned(item.startRelay)) errors.push(`${item.label}: assign a start relay`)
        if (['three-wire', 'momentary-start-stop'].includes(item.controlStrategy) && !assigned(item.stopRelay)) errors.push(`${item.label}: assign a stop relay`)
      }
      if (section === 'hvacZones' && item.controlMode === 'controller' && !['coolRelay', 'furnaceRelay', 'heatPumpRelay', 'fanRelay'].some(key => item[key] >= 0)) errors.push(`${item.label}: assign an equipment relay`)
      if (['acBreakers', 'dcCircuits'].includes(section) && item.controllable && !assigned(item.relay)) errors.push(`${item.label}: controllable circuits require a relay`)
      if (['batteries','inverters','solarChargeControllers'].includes(section) && !configuredText(item.communication) && !configuredText(item.sensorType) && !assigned(item.senseGpio) && !assigned(item.adcChannel)) errors.push(`${item.label}: select communications or assign a sensor input`)
      if (section === 'waterTanks' && !configuredText(item.sensorType)) errors.push(`${item.label}: select a tank sensor type`)
      if (section === 'cameras' && !configuredText(item.streamUrl) && !configuredText(item.snapshotUrl)) errors.push(`${item.label}: enter a stream or snapshot URL`)
      if (section === 'securitySensors' && !configuredText(item.inputType) && !assigned(item.gpio) && !assigned(item.senseGpio)) errors.push(`${item.label}: select a security input strategy`)
      if (['waterPumps', 'customIo', 'inverters'].includes(section) && item.controlMode === 'controller' && !(Number.isInteger(item.relay) && item.relay >= 0)) errors.push(`${item.label}: controller-managed outputs require a relay`)
      if (section === 'waterHeaters' && item.controlMode === 'controller' && !['acElementRelay', 'dcElementRelay', 'propaneRelay'].some(key => Number.isInteger(item[key]) && item[key] >= 0)) errors.push(`${item.label}: assign a heating output`)
      if (section === 'securitySensors' && item.zoneId && !(profile.securityZones || []).some(zone => zone.enabled && zone.id === item.zoneId)) errors.push(`${item.label}: select an enabled security zone`)
      if (section === 'waterTanks' && (!(item.capacityGal > 0) || item.emptyMv === item.fullMv)) errors.push(`${item.label}: enter positive capacity and distinct empty/full calibration`)
    }
  }
  return [...new Set(errors)]
}
