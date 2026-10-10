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
