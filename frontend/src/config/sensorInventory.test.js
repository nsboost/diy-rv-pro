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

test('matching label or ID never substitutes a different hardware address', () => {
  const readings = demoReadings(1000)
  readings[0].address = readings[1].address
  assert.equal(resolveTemperature(demoProfile.temperatureZones[0], readings, 1000).tempF, null)
  assert.equal(resolveTemperature(demoProfile.temperatureZones[1], readings, 40000).status, 'stale')
})
