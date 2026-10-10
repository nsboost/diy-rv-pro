import test from 'node:test'
import assert from 'node:assert/strict'
import { ruleStatus } from './ruleStatus.js'
import { controlSystems, sourceCatalog } from '../config/automationCatalog.js'
import { demoProfile } from '../data/demoProfile.js'

test('rule status separates enabled state from execution and failed restore', () => {
  assert.equal(ruleStatus({enabled:false}, {active:true,error:'Driver unavailable'}), 'Disabled')
  assert.equal(ruleStatus({enabled:true}), 'Waiting for evaluator')
  assert.equal(ruleStatus({enabled:true}, {active:true,error:'Restore failed'}), 'Action pending: Restore failed')
  assert.equal(ruleStatus({enabled:true}, {active:true}), 'Triggered')
  assert.equal(ruleStatus({enabled:true}, {since:0}), 'Holding trigger')
  assert.equal(ruleStatus({enabled:true}, {holding:true}), 'Holding trigger')
  assert.equal(ruleStatus({enabled:true}, {since:null,sourceAvailable:false}), 'Waiting for valid input')
  assert.equal(ruleStatus({enabled:true}, {since:null,sourceAvailable:true}), 'Watching trigger')
})

test('rule status flags removed sources and outputs before the trigger fires', () => {
  const profile = structuredClone(demoProfile)
  const rule = {enabled:true,trigger:{source:'solar.watts'},action:{target:'device.acBreakers.demo-ac1',command:'open'},reverse:{enabled:true,source:'solar.watts',target:'device.acBreakers.demo-ac1',command:'close'}}
  const status = () => ruleStatus(rule,{sourceAvailable:true}, {sources:sourceCatalog(profile),systems:controlSystems(profile)})
  assert.equal(status(), 'Watching trigger')
  profile.acBreakers[0].relay = -1
  assert.equal(status(), 'Needs configuration: action unavailable')
  profile.acBreakers[0].relay = 3
  rule.reverse.target = 'removed-output'
  assert.equal(status(), 'Needs configuration: restore action unavailable')
  rule.reverse.target = rule.action.target
  rule.reverse.source = 'temperature.removed.tempF'
  assert.equal(status(), 'Needs configuration: restore source unavailable')
  profile.solarChargeControllers = []
  assert.equal(status(), 'Needs configuration: trigger source unavailable')
})
