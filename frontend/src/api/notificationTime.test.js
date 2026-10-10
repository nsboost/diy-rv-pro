import test from 'node:test'
import assert from 'node:assert/strict'
import {notificationTimeLabel} from './notificationTime.js'
test('alert history distinguishes valid calendar time from uptime and missing timestamps',()=>{
  assert.equal(notificationTimeLabel({createdAt:0}),new Date(0).toLocaleString())
  assert.equal(notificationTimeLabel({uptimeMs:1250}),'Controller uptime 1 seconds')
  assert.equal(notificationTimeLabel({uptimeMs:0}),'Controller uptime 0 seconds')
  for (const value of [null,undefined,'1000',NaN,Infinity,-1]) assert.equal(notificationTimeLabel({createdAt:value,uptimeMs:value}),'Time unavailable')
  assert.equal(notificationTimeLabel({createdAt:8640000000000001}),'Time unavailable')
})
