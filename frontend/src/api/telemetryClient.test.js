import { defaultSystemProfile } from '../config/systemProfile.js'
import assert from 'node:assert/strict'
import test from 'node:test'

import { applyControlAction, createLocalController, fetchConfig } from './telemetryClient.js'
import { cloneTelemetry } from '../data/mockTelemetry.js'

test('generator control actions mutate simulated state only', () => {
  const initial = cloneTelemetry()
  const started = applyControlAction(initial, { type: 'generator.start' })
  const stopped = applyControlAction(started, { type: 'generator.stop' })

  assert.equal(initial.generator.running, false)
  assert.equal(started.generator.running, true)
  assert.equal(stopped.generator.running, false)
  assert.match(started.events[0].message, /simulation/i)
})

test('automation.setEnabled requires a known rule', () => {
  const initial = cloneTelemetry()
  const updated = applyControlAction(initial, {
    type: 'automation.setEnabled',
    id: 'quiet-hours',
    enabled: true
  })

  assert.equal(updated.automationRules.find(rule => rule.id === 'quiet-hours').enabled, true)
  for (const enabled of ['false', 0, null, undefined]) {
    assert.throws(() => applyControlAction(initial, {type:'automation.setEnabled',id:'quiet-hours',enabled}), /must be true or false/)
  }
  assert.throws(
    () => applyControlAction(initial, { type: 'automation.setEnabled', id: 'missing', enabled: true }),
    /not found/
  )
})

test('notification control acknowledges only the requested alert and updates unread count', () => {
  const initial = cloneTelemetry()
  initial.notifications = [{id:'one',read:false},{id:'two',read:false}]
  initial.controller.alerts = 2
  const updated = applyControlAction(initial,{type:'notification.acknowledge',id:'one'})
  assert.equal(updated.notifications[0].read,true)
  assert.equal(updated.notifications[1].read,false)
  assert.equal(updated.controller.alerts,1)
  assert.equal(initial.notifications[0].read,false)
  assert.throws(() => applyControlAction(initial,{type:'notification.acknowledge',id:'missing'}), /not found/)
})

test('hvac setpoint validation rejects unsafe ranges', () => {
  const initial = cloneTelemetry()
  const updated = applyControlAction(initial, {
    type: 'hvac.setTarget',
    zoneId: 'zone-1',
    setpointF: 73
  })

  assert.equal(updated.hvacZones[0].setpointF, 73)
  assert.throws(
    () => applyControlAction(initial, { type: 'hvac.setTarget', zoneId: 'zone-1', setpointF: 120 }),
    /out of range/
  )
})

test('hvac settings validation updates cool heat differential and offset', () => {
  const initial = cloneTelemetry()
  const updated = applyControlAction(initial, {
    type: 'hvac.updateSettings',
    zoneId: 'zone-1',
    settings: {
      mode: 'Auto',
      coolSetpointF: 74,
      heatSetpointF: 66,
      autoDifferentialF: 4,
      sensorOffsetF: -2
    }
  })

  assert.equal(updated.hvacZones[0].mode, 'Auto')
  assert.equal(updated.hvacZones[0].coolSetpointF, 74)
  assert.equal(updated.hvacZones[0].heatSetpointF, 66)
  assert.equal(updated.hvacZones[0].autoDifferentialF, 4)
  assert.equal(updated.hvacZones[0].sensorOffsetF, -2)
  assert.throws(
    () => applyControlAction(initial, {
      type: 'hvac.updateSettings',
      zoneId: 'zone-1',
      settings: {
        mode: 'Cool',
        coolSetpointF: 65,
        heatSetpointF: 68,
        autoDifferentialF: 3,
        sensorOffsetF: 0
      }
    }),
    /below cool/
  )
})

test('automation.upsert validates complete rule definitions', () => {
  const initial = cloneTelemetry()
  const updated = applyControlAction(initial, {
    type: 'automation.upsert',
    rule: {
      id: 'block-water-pump-gray-full',
      name: 'Block Water Pump When Gray Full',
      enabled: true,
      trigger: {
        source: 'tank.gray.level',
        label: 'Gray Tank Level',
        operator: '>',
        value: '85',
        holdFor: '0 min'
      },
      action: {
        category: 'Water',
        type: 'block',
        target: 'waterPump',
        targetLabel: 'Water Pump',
        command: 'blockOn',
        commandLabel: 'Block Turning On',
        value: 'on blocked'
      },
      reverse: {
        enabled: true,
        source: 'tank.gray.level',
        operator: '<',
        value: '75',
        target: 'waterPump',
        targetLabel: 'Water Pump',
        command: 'unblock',
        commandLabel: 'Remove Block',
        action: 'waterPump.unblock'
      }
    }
  })

  assert.equal(updated.automationRules[0].id, 'block-water-pump-gray-full')
  assert.equal(updated.automationRules[0].action.type, 'block')
  assert.equal(updated.automationRules[0].action.command, 'blockOn')
  assert.equal(updated.automationRules[0].reverse.command, 'unblock')
  assert.throws(
    () => applyControlAction(initial, {
      type: 'automation.upsert',
      rule: {
        name: 'Bad Rule',
        enabled: true,
        trigger: { source: 'battery.voltage', operator: '>', value: '12' },
        action: { type: 'unknown', target: 'generator', command: 'start' }
      }
    }),
    /action/
  )
})

test('automation.upsert supports solar-triggered circuit shedding with restore action', () => {
  const initial = cloneTelemetry()
  const updated = applyControlAction(initial, {
    type: 'automation.upsert',
    rule: {
      id: 'shed-ac-low-solar',
      name: 'Shed AC Breaker On Low Solar',
      enabled: true,
      trigger: {
        source: 'solar.watts',
        label: 'Solar Generation Watts',
        operator: '<=',
        value: '250',
        holdFor: '10 min'
      },
      action: {
        category: 'AC Breakers',
        type: 'state',
        target: 'breaker.ac.1',
        targetLabel: 'AC Breaker 1',
        command: 'open',
        commandLabel: 'Open / Shut Off Circuit',
        value: 'open'
      },
      reverse: {
        enabled: true,
        source: 'battery.voltage',
        operator: '>=',
        value: '13.2',
        target: 'breaker.ac.1',
        targetLabel: 'AC Breaker 1',
        command: 'close',
        commandLabel: 'Close / Restore Circuit'
      }
    }
  })

  assert.equal(updated.automationRules[0].trigger.source, 'solar.watts')
  assert.equal(updated.automationRules[0].action.target, 'breaker.ac.1')
  assert.equal(updated.automationRules[0].action.command, 'open')
  assert.equal(updated.automationRules[0].reverse.action, 'breaker.ac.1.close')
})

test('local controller notifies subscribers after dispatch', () => {
  const controller = createLocalController()
  let notifications = 0

  const unsubscribe = controller.subscribe(() => {
    notifications += 1
  })

  controller.dispatch({ type: 'automation.setEnabled', id: 'quiet-hours', enabled: true })
  unsubscribe()
  controller.dispatch({ type: 'automation.setEnabled', id: 'quiet-hours', enabled: false })

  assert.equal(notifications, 2)
})

test('controller configuration reads reject missing or malformed inventories before normalization', async () => {
  const original = globalThis.fetch
  let payload = {setupComplete:true,features:structuredClone(defaultSystemProfile)}
  globalThis.fetch = async () => ({ok:true,json:async()=>payload})
  try {
    assert.equal((await fetchConfig('test')).features.schemaVersion,1)
    for (const invalid of [{setupComplete:true},{setupComplete:'true',features:defaultSystemProfile},{setupComplete:true,features:{...defaultSystemProfile,hvacZones:'bad'}}]) {
      payload = invalid
      await assert.rejects(fetchConfig('test'), /invalid configuration/)
    }
  } finally {globalThis.fetch = original}
})
