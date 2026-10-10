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

test('water heater rules select each installed heating or recirculation output independently', () => {
  const profile = structuredClone(demoProfile)
  profile.waterHeaters = [{id:'heater-1',label:'Main water heater',enabled:true,controlMode:'controller',acElementRelay:4,dcElementRelay:-1,propaneRelay:5,recircPumpRelay:6}]
  const targets = controlSystems(profile).filter(item => item.category === 'Water Heaters').map(item => item.id)
  assert.deepEqual(targets,['device.waterHeaters.heater-1.acElement','device.waterHeaters.heater-1.propane','device.waterHeaters.heater-1.recirculation'])
  assert.ok(sourceCatalog(profile).some(([id]) => id === 'device.waterHeaters.heater-1.propane.state'))
  assert.ok(!targets.includes('device.waterHeaters.heater-1'))
  profile.waterHeaters[0].controlMode = 'monitor-only'
  assert.ok(!controlSystems(profile).some(item => item.category === 'Water Heaters'))
})
