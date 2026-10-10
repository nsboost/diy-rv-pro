import test from 'node:test'
import assert from 'node:assert/strict'
import {sampledAtFromRequest} from './sensorFreshness.js'
test('sensor freshness uses request start and rejects invalid ages',()=>{
  assert.equal(sampledAtFromRequest(10000,1500),8500)
  assert.equal(sampledAtFromRequest(10000,0),10000)
  for (const age of [-1,NaN,Infinity,'0',null,undefined,10001]) assert.equal(sampledAtFromRequest(10000,age),null)
})
