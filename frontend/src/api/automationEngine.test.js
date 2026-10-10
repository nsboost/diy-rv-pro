import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateRules, durationMs, compareCondition, validateCondition } from './automationEngine.js'
import { createLocalController } from './telemetryClient.js'
import { demoProfile, demoReadings } from '../data/demoProfile.js'
import { cloneTelemetry } from '../data/mockTelemetry.js'

const alertRule = { id: 'bedroom-alert', name: 'Bedroom too warm', enabled: true,
  trigger: { source: 'temperature.demo-temp-2.tempF', operator: '>', value: '75', holdFor: '5 sec' },
  action: { type: 'alert', target: 'notification', command: 'sendAlert', value: 'Bedroom hot' },
  reverse: { enabled: true, source: 'temperature.demo-temp-2.tempF', operator: '<', value: '72', target: 'notification', command: 'sendAlert', restoreValue: 'Bedroom recovered' } }

test('clock comparisons use HH:MM consistently and reject invalid times', () => {
  for (const [operator, minute, expected] of [['=', 390, true], ['!=', 391, true], ['>', 391, true], ['<', 389, true], ['>=', 390, true], ['<=', 390, true]]) {
    const condition = { source: 'time.local', operator, value: '06:30' }
    validateCondition(condition)
    assert.equal(compareCondition(condition, minute), expected)
  }
  assert.throws(() => validateCondition({ source: 'time.local', operator: '=', value: '25:00' }), /HH:MM/)
})

test('addressed sensor triggers after continuous hold, once, and restores once', () => {
  const state = {}
  const telemetry = { temperatures: [{ id: 'demo-temp-2', tempF: 80, status: 'ok', sampledAt: 1000 }] }
  assert.equal(evaluateRules([alertRule], telemetry, state, 1000).length, 0)
  assert.equal(evaluateRules([alertRule], telemetry, state, 5999).length, 0)
  assert.equal(evaluateRules([alertRule], telemetry, state, 6000).length, 1)
  assert.equal(evaluateRules([alertRule], telemetry, state, 7000).length, 0)
  telemetry.temperatures[0].tempF = 70
  assert.equal(evaluateRules([alertRule], telemetry, state, 8000)[0].restoring, true)
  assert.equal(evaluateRules([alertRule], telemetry, state, 9000).length, 0)
})

test('a disconnected or stale sensor resets hold and cannot trigger', () => {
  const state = {}
  const telemetry = { temperatures: [{ id: 'demo-temp-2', tempF: 80, status: 'ok', sampledAt: 1000 }] }
  evaluateRules([alertRule], telemetry, state, 1000)
  telemetry.temperatures[0].status = 'disconnected'
  assert.equal(evaluateRules([alertRule], telemetry, state, 6000).length, 0)
  telemetry.temperatures[0].status = 'ok'
  assert.equal(evaluateRules([alertRule], telemetry, state, 40000).length, 0)
})

test('time ranges cross midnight and malformed hold durations fail', () => {
  const condition = { source: 'time.local', operator: 'between', value: '22:00-07:00' }
  assert.equal(compareCondition(condition, 23 * 60), true)
  assert.equal(compareCondition(condition, 6 * 60), true)
  assert.equal(compareCondition(condition, 12 * 60), false)
  assert.throws(() => durationMs('five minutes'))
  assert.throws(() => durationMs('25 hours'))
})

test('rules, configuration and acknowledged alerts survive controller recreation', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  const controller = createLocalController(cloneTelemetry(), { storage, initialProfile: demoProfile })
  controller.dispatch({ type: 'automation.upsert', rule: { ...alertRule, trigger: { ...alertRule.trigger, holdFor: '0 sec' } } })
  controller.setReadings(demoReadings(1000).map(item => ({...item, tempF: 80})))
  const snapshot = controller.tick(1000)
  const notification = snapshot.notifications.find(item => item.ruleId === alertRule.id)
  assert.ok(notification)
  controller.acknowledge(notification.id)
  const restored = createLocalController(cloneTelemetry(), { storage })
  assert.equal(restored.getConfig().features.temperatureZones[1].address, demoProfile.temperatureZones[1].address)
  assert.ok(restored.getTelemetry().automationRules.some(rule => rule.id === alertRule.id))
  assert.equal(restored.getTelemetry().notifications.find(item => item.id === notification.id).read, true)
})

test('failed acknowledgement persistence leaves the alert unread and allows retry', () => {
  const values = new Map()
  let failWrites = false
  const storage = {getItem:key => values.get(key), setItem:(key,value) => {
    if (failWrites) throw new Error('Quota exceeded')
    values.set(key,value)
  }}
  const controller = createLocalController(cloneTelemetry(), {storage,initialProfile:demoProfile})
  controller.dispatch({type:'automation.upsert',rule:{...alertRule,trigger:{...alertRule.trigger,holdFor:'0 sec'}}})
  controller.setReadings(demoReadings(1000).map(item => ({...item,tempF:80})))
  const alert = controller.tick(1000).notifications.find(item => item.ruleId === alertRule.id)
  const saved = values.get('diy-rv-demo-v2')
  failWrites = true
  assert.throws(() => controller.acknowledge(alert.id), /could not be saved/)
  assert.equal(controller.getTelemetry().notifications.find(item => item.id === alert.id).read,false)
  assert.equal(values.get('diy-rv-demo-v2'),saved)
  failWrites = false
  controller.acknowledge(alert.id)
  const restored = createLocalController(cloneTelemetry(), {storage})
  assert.equal(restored.getTelemetry().notifications.find(item => item.id === alert.id).read,true)
  assert.throws(() => controller.acknowledge('missing'), /not found/)
})

test('blocking rule prevents generator action irrespective of rule ordering', () => {
  const controller = createLocalController(cloneTelemetry(), {initialProfile: demoProfile})
  const trigger = {source: 'battery.voltage', operator: '>', value: '0', holdFor: '0 sec'}
  controller.dispatch({type: 'automation.upsert', rule: {id: 'block', name: 'Block generator', enabled: true, trigger, action: {type: 'block', target: 'generator.autoStart', command: 'blockOn'}, reverse: {enabled: false}}})
  controller.dispatch({type: 'automation.upsert', rule: {id: 'start', name: 'Start generator', enabled: true, trigger, action: {type: 'command', target: 'generator', command: 'start'}, reverse: {enabled: false}}})
  const snapshot = controller.tick(1000)
  assert.equal(snapshot.generator.running, false)
  assert.ok(snapshot.notifications.some(item => item.message.includes('blocking rule')))
})


test('saved rules cannot operate a generator changed to monitor-only', () => {
  const controller = createLocalController(cloneTelemetry(), {initialProfile: demoProfile})
  controller.dispatch({type:'automation.upsert',rule:{id:'start-removed',name:'Temperature start',enabled:true,
    trigger:{source:'temperature.demo-temp-1.tempF',operator:'>',value:'70',holdFor:'0 sec'},
    action:{type:'command',target:'generator',command:'start'},reverse:{enabled:false}}})
  const config = controller.getConfig()
  config.features.generators[0].controlStrategy = 'monitor-only'
  controller.updateConfig(config)
  controller.setReadings(demoReadings(1000))
  const snapshot = controller.tick(1000)
  assert.equal(snapshot.generator.running, false)
  assert.equal(snapshot.ruleRuntime['start-removed'].active, false)
  assert.ok(snapshot.notifications.some(item => item.ruleId === 'start-removed' && item.message.includes('unavailable')))
})

test('adding demo power equipment restores simulated values after unconfigured projection', () => {
  const empty = structuredClone(demoProfile)
  empty.batteries=[]; empty.solarChargeControllers=[]; empty.inverters=[]; empty.acBreakers=[]
  const controller = createLocalController(cloneTelemetry(), {initialProfile:empty})
  const before = controller.tick(1000)
  assert.equal(before.battery.voltage,null)
  assert.deepEqual(before.powerHistory,[])
  controller.updateConfig({features:demoProfile})
  const after = controller.tick(2000)
  assert.ok(Number.isFinite(after.battery.voltage))
  assert.ok(Number.isFinite(after.solar.watts))
  assert.ok(Number.isFinite(after.loads.watts))
  assert.ok(after.powerHistory.length)
  assert.equal(after.controller.mode,'simulation')
})

test('demo water heater automation changes only the selected output', () => {
  const profile = structuredClone(demoProfile)
  profile.waterHeaters=[{id:'heater-1',label:'Water heater',enabled:true,controlMode:'controller',acElementRelay:4,dcElementRelay:-1,propaneRelay:5,recircPumpRelay:6}]
  const controller=createLocalController(cloneTelemetry(),{initialProfile:profile})
  controller.dispatch({type:'automation.upsert',rule:{id:'heater-rule',name:'Heat water',enabled:true,
    trigger:{source:'temperature.demo-temp-1.tempF',operator:'>',value:'70',holdFor:'0 sec'},
    action:{type:'state',target:'device.waterHeaters.heater-1.acElement',command:'turnOn'},reverse:{enabled:false}}})
  controller.setReadings(demoReadings(1000))
  const snapshot=controller.tick(1000)
  assert.equal(snapshot.outputStates['device.waterHeaters.heater-1.acElement'],true)
  assert.equal(snapshot.outputStates['device.waterHeaters.heater-1.propane'],undefined)
  assert.equal(snapshot.outputStates['device.waterHeaters.heater-1.recirculation'],undefined)
})

test('browser alerts work independently of in-app notification preference', () => {
  const original = globalThis.Notification
  const delivered = []
  class BrowserNotification {
    static permission = 'granted'
    constructor(title, options) { delivered.push({title, ...options}) }
  }
  globalThis.Notification = BrowserNotification
  try {
    const controller = createLocalController(cloneTelemetry(), { initialProfile: demoProfile })
    controller.setNotificationSettings({ inApp: false, desktop: true })
    controller.dispatch({ type: 'automation.upsert', rule: { ...alertRule, trigger: { ...alertRule.trigger, holdFor: '0 sec' } } })
    controller.setReadings(demoReadings(1000).map(item => ({...item, tempF: 80})))
    const snapshot = controller.tick(1000)
    assert.equal(snapshot.notifications.length, 0)
    assert.ok(delivered.some(item => item.body === 'Bedroom hot'))
  } finally { globalThis.Notification = original }
})

test('unsupported email actions are rejected instead of promising delivery', () => {
  const controller = createLocalController(cloneTelemetry(), { initialProfile: demoProfile })
  assert.throws(() => controller.dispatch({type: 'automation.upsert', rule: {
    ...alertRule, action: {type: 'email', target: 'email', command: 'sendEmail'}
  }}), /action is incomplete/)
})


test('successful sensor alert activation survives reload without duplicate delivery', () => {
  const values = new Map()
  const storage = {getItem:key => values.get(key), setItem:(key,value) => values.set(key,value)}
  const controller = createLocalController(cloneTelemetry(), {storage,initialProfile:demoProfile})
  controller.dispatch({type:'automation.upsert',rule:{...alertRule,trigger:{...alertRule.trigger,holdFor:'0 sec'}}})
  controller.setReadings(demoReadings(1000).map(item => ({...item,tempF:80})))
  controller.tick(1000)
  const restored = createLocalController(cloneTelemetry(), {storage})
  restored.setReadings(demoReadings(2000).map(item => ({...item,tempF:80})))
  const snapshot = restored.tick(2000)
  assert.equal(snapshot.notifications.filter(item => item.ruleId === alertRule.id).length,1)
})

test('manual generator commands respect rules and disabled blocks clear immediately', () => {
  const controller = createLocalController(cloneTelemetry(), {initialProfile:demoProfile})
  controller.dispatch({type:'automation.upsert',rule:{id:'block-manual',name:'Block manual starts',enabled:true,trigger:{source:'battery.voltage',operator:'>',value:'0',holdFor:'0 sec'},action:{type:'block',target:'generator',command:'blockOn'},reverse:{enabled:false}}})
  controller.tick()
  assert.throws(() => controller.dispatch({type:'generator.start'}), /blocking rule/)
  controller.dispatch({type:'automation.setEnabled',id:'block-manual',enabled:false})
  assert.equal(controller.dispatch({type:'generator.start'}).generator.running,true)
})

test('manual HVAC cannot activate unconfigured equipment or bypass an unavailable sensor', () => {
  const seed = cloneTelemetry()
  seed.hvacZones[0].ac = false
  const controller = createLocalController(seed, {initialProfile:demoProfile})
  assert.throws(() => controller.dispatch({type:'hvac.toggleEquipment',zoneId:'zone-1',equipment:'furnace'}),/not configured/)
  assert.throws(() => controller.dispatch({type:'hvac.toggleEquipment',zoneId:'zone-1',equipment:'ac'}),/sensor unavailable/)
  assert.throws(() => controller.dispatch({type:'hvac.updateSettings',zoneId:'zone-1',settings:{mode:'Auto'}}),/sensor unavailable/)
})
