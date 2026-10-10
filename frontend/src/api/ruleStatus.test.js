import test from 'node:test'
import assert from 'node:assert/strict'
import { ruleStatus } from './ruleStatus.js'

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
