import test from 'node:test'
import assert from 'node:assert/strict'
import { controlSystems, sourceCatalog } from './automationCatalog.js'
import { demoProfile } from '../data/demoProfile.js'
import { defaultSystemProfile } from './systemProfile.js'

test('only configured sensors, tanks and relay equipment are selectable', () => {
  const empty = {...structuredClone(defaultSystemProfile), rvProfile:{...defaultSystemProfile.rvProfile,shorePower:'None'}}
  assert.deepEqual(sourceCatalog(empty), [['time.local','Local Time']])
  assert.deepEqual(controlSystems(empty).map(item => item.id), ['notification'])
  const systems = controlSystems(demoProfile)
  assert.ok(systems.some(item => item.id === 'hvac.zone-2.heatPump'))
  assert.ok(!systems.some(item => item.id === 'hvac.zone-2.ac'))
  assert.ok(systems.some(item => item.id === 'device.acBreakers.demo-ac1'))
  assert.ok(sourceCatalog(demoProfile).some(([id]) => id === 'temperature.demo-temp-2.tempF'))
  const removed = {...demoProfile, temperatureZones: [],waterTanks: []}
  assert.ok(!sourceCatalog(removed).some(([id]) => id.startsWith('temperature.') || id.startsWith('tank.')))
})
