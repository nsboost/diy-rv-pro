import test from 'node:test'
import assert from 'node:assert/strict'
import { demoProfile, demoReadings } from '../data/demoProfile.js'
import { validateProfile } from './validateProfile.js'
import { validTemperatureAddress, resolveTemperature } from './sensorInventory.js'
import { projectTelemetry } from '../api/profileTelemetry.js'
import { cloneTelemetry } from '../data/mockTelemetry.js'

test('malformed imported inventories return validation errors without crashing setup', () => {
  assert.ok(validateProfile(null).length)
  assert.ok(validateProfile([]).length)
  for (const value of [null, [], 'invalid', { label: 42, enabled: true }, { label: 'Sensor', enabled: 'false' }, { label: 'Sensor', enabled: true, address: 28 }]) {
    const profile = structuredClone(demoProfile)
    profile.temperatureZones.push(value)
    assert.ok(validateProfile(profile).length)
  }
  const profile = structuredClone(demoProfile)
  profile.temperatureBuses = { gpio: 4 }
  assert.ok(validateProfile(profile).some(error => error.includes('inventory list')))
})

test('setup rejects controller-incompatible timing, calibration and capacity values', () => {
  for (const [section, key, value] of [['generators', 'maxCrankSeconds', 31], ['generators', 'warmupSeconds', -1], ['waterTanks', 'fullMv', 3301], ['waterTanks', 'capacityGal', 2.5], ['temperatureZones', 'highAlarmF', 251], ['batteries', 'capacityAh', 2001]]) {
    const profile = structuredClone(demoProfile)
    profile[section][0][key] = value
    assert.ok(validateProfile(profile).some(error => error.includes(key)))
  }
  const profile = structuredClone(demoProfile)
  profile.hvacZones[0].controlMode = 'unsupported'
  assert.ok(validateProfile(profile).some(error => error.includes('HVAC control mode')))
})

test('enabled equipment requires its input or output even when imported fields are omitted', () => {
  const profile = structuredClone(demoProfile)
  delete profile.generators[0].startRelay
  delete profile.acBreakers[0].relay
  profile.batteries[0].communication = 'disabled'
  profile.batteries[0].sensorType = 'disabled'
  profile.batteries[0].senseGpio = -1
  profile.batteries[0].adcChannel = -1
  profile.waterTanks[0].sensorType = 'disabled'
  profile.cameras = [{id:'camera',label:'Camera',enabled:true,streamUrl:'',snapshotUrl:''}]
  const errors = validateProfile(profile)
  for (const message of ['assign a start relay','controllable circuits require a relay','communications or assign a sensor input','select a tank sensor type','stream or snapshot URL']) assert.ok(errors.some(error => error.includes(message)),message)
  profile.generators[0].enabled = false
  profile.acBreakers[0].enabled = false
  profile.batteries[0].enabled = false
  profile.waterTanks[0].enabled = false
  profile.cameras[0].enabled = false
  assert.deepEqual(validateProfile(profile),[])
})

test('setup measures text limits in UTF-8 bytes to match controller storage', () => {
  const profile = structuredClone(demoProfile)
  profile.rvProfile.name = 'é'.repeat(24)
  profile.batteries[0].label = 'é'.repeat(24)
  profile.batteries[0].id = 'a'.repeat(32)
  assert.deepEqual(validateProfile(profile), [])
  profile.rvProfile.name += 'é'
  profile.batteries[0].label += 'é'
  profile.batteries[0].id += 'é'
  const errors = validateProfile(profile)
  assert.ok(errors.some(error => error.startsWith('RV name')))
  assert.ok(errors.some(error => error.includes('labels must')))
  assert.ok(errors.some(error => error.includes('invalid or duplicate item identity')))
})

test('inventory identities cannot inject automation path separators or object keys', () => {
  for (const id of ['zone.1', '__proto__', 'constructor', 'prototype', 'living room', 'é', '']) {
    const profile = structuredClone(demoProfile)
    profile.batteries[0].id = id
    assert.ok(validateProfile(profile).some(error => error.includes('item identity')), id)
  }
})

test('imported optional text fields are checked before sensor and reference validation', () => {
  for (const [key, limit] of [['busId',32], ['temperatureSensorId',32], ['gatewayName',48], ['streamUrl',256], ['snapshotUrl',256], ['address',16], ['protocol',32]]) {
    for (const value of [null, 42, {}, 'é'.repeat(limit / 2 + 1)]) {
      const profile = structuredClone(demoProfile)
      profile.temperatureZones[0][key] = value
      assert.ok(validateProfile(profile).some(error => error.includes(`${key} must be text`)), key)
    }
  }
})

test('imported control flags cannot use truthy strings or numbers', () => {
  for (const key of ['controllable', 'monitored', 'requiresAuth', 'armAway', 'hasPropane']) {
    for (const value of ['false', 1, null]) {
      const profile = structuredClone(demoProfile)
      profile.acBreakers[0][key] = value
      assert.ok(validateProfile(profile).some(error => error.includes(`${key} must be true or false`)))
    }
  }
})

test('two zones share one bus but keep stable, separate sensor identities', () => {
  assert.deepEqual(validateProfile(demoProfile), [])
  const readings = demoReadings(1000).reverse()
  const telemetry = projectTelemetry({...cloneTelemetry(), temperatures: readings}, demoProfile, 1000)
  assert.equal(telemetry.hvacZones[0].tempF, 72)
  assert.equal(telemetry.hvacZones[1].tempF, 70)
  assert.equal(telemetry.hvacZones[1].sensorLabel, 'Bedroom')
})

test('bad ROM CRC, duplicate address, missing references and pin conflicts are rejected', () => {
  assert.equal(validTemperatureAddress('2801000000000000'), false)
  const profile = structuredClone(demoProfile)
  profile.temperatureZones[1].address = profile.temperatureZones[0].address
  profile.hvacZones[1].temperatureSensorId = 'deleted-sensor'
  profile.generators[0].runSenseGpio = 4
  const errors = validateProfile(profile)
  assert.ok(errors.some(error => error.includes('already registered')))
  assert.ok(errors.some(error => error.includes('missing or disabled')))
  assert.ok(errors.some(error => error.includes('conflicts with a temperature bus')))
})

test('an analog input cannot share the temperature bus GPIO', () => {
  const profile = structuredClone(demoProfile)
  profile.waterTanks[0].adcChannel = profile.temperatureBuses[0].gpio
  assert.ok(validateProfile(profile).some(error => error.includes('adcChannel conflicts')))
  profile.waterTanks[0].enabled = false
  assert.ok(!validateProfile(profile).some(error => error.includes('adcChannel conflicts')))
})

test('demo projection clears outputs removed from climate configuration', () => {
  const profile = structuredClone(demoProfile)
  const snapshot = {...cloneTelemetry(), temperatures:demoReadings(1000)}
  snapshot.controller.mode = 'simulation'
  snapshot.hvacZones[0].ac = true
  snapshot.hvacZones[0].auto = true
  profile.hvacZones[0].coolRelay = -1
  profile.hvacZones[0].heatPumpRelay = 0
  let projected = projectTelemetry(snapshot,profile,1000)
  assert.equal(projected.hvacZones[0].ac,false)
  assert.deepEqual(projected.hvacZones[0].availableEquipment,['heatPump'])
  profile.hvacZones[0].controlMode = 'monitor-only'
  projected = projectTelemetry(snapshot,profile,1000)
  assert.equal(projected.hvacZones[0].auto,false)
  assert.equal(projected.hvacZones[0].ac,false)
  assert.equal(snapshot.hvacZones[0].ac,true)
  snapshot.controller.mode = 'device'
  snapshot.controller.equipmentMode = 'hardware'
  projected = projectTelemetry(snapshot,profile,1000)
  assert.equal(projected.hvacZones[0].ac,true)
})

test('matching label or ID never substitutes a different hardware address', () => {
  const readings = demoReadings(1000)
  readings[0].address = readings[1].address
  assert.equal(resolveTemperature(demoProfile.temperatureZones[0], readings, 1000).tempF, null)
  assert.equal(resolveTemperature(demoProfile.temperatureZones[1], readings, 40000).status, 'stale')
})
