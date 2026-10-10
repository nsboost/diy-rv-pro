import test from 'node:test'
import assert from 'node:assert/strict'
import {validateTelemetry} from './validateTelemetry.js'
import {initialTelemetry} from '../data/mockTelemetry.js'

test('valid telemetry preserves unavailable readings and controller storage feedback', () => {
  const value=structuredClone(initialTelemetry)
  value.battery.voltage=null
  value.storageError='Saved automation storage unavailable'
  value.notifications=[]
  delete value.systemStatus // Firmware omits this UI-derived inventory summary.
  assert.equal(validateTelemetry(value),value)
  assert.equal(value.battery.voltage,null)
})

test('incomplete telemetry and malformed render collections are rejected', () => {
  for (const value of [null,[],{}, {...initialTelemetry,controller:null}, {...initialTelemetry,hvacZones:null}, {...initialTelemetry,events:[null]}, {...initialTelemetry,systemStatus:[{}]}, {...initialTelemetry,notifications:[null]}, {...initialTelemetry,ruleRuntime:[]}, {...initialTelemetry,storageError:{message:'bad'}}]) {
    assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
  }
})

test('rendered text and numeric readings reject objects and coerced numbers', () => {
  for (const [section,key,bad] of [['controller','name',{}],['solar','watts','482'],['battery','voltage',Infinity],['time','display',[]]]) {
    const value=structuredClone(initialTelemetry)
    value[section][key]=bad
    assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
  }
  const value=structuredClone(initialTelemetry)
  value.events[0].message={text:'bad'}
  assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
})

test('telemetry flags reject truthy coercions while retaining false and unknown contacts', () => {
  for (const [section,key] of [['shorePower','connected'],['generator','running'],['generator','autoStart']]) {
    const value=structuredClone(initialTelemetry)
    value[section][key]='false'
    assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
    value[section][key]=false
    assert.equal(validateTelemetry(value),value)
  }
  const value=structuredClone(initialTelemetry)
  value.notifications=[{id:'alert',read:'false'}]
  assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
  value.notifications[0].read=false
  value.securityInputs=[{id:'door',active:null}]
  assert.equal(validateTelemetry(value),value)
  value.ruleRuntime={rule:{active:'false'}}
  assert.throws(()=>validateTelemetry(value),/invalid telemetry/)
})

test('notification telemetry requires unique bounded acknowledgement identities', () => {
  for (const notifications of [[{}],[{id:''}],[{id:' '.repeat(2)}],[{id:'é'.repeat(17)}],[{id:'same'},{id:'same'}]]) {
    assert.throws(()=>validateTelemetry({...structuredClone(initialTelemetry),notifications}),/invalid telemetry/)
  }
  const value={...structuredClone(initialTelemetry),notifications:[{id:'one',read:false},{id:'two',read:true}]}
  assert.equal(validateTelemetry(value),value)
})
