import test from 'node:test'
import assert from 'node:assert/strict'
import {confirmedControl} from './confirmedControl.js'

test('accepted command with failed confirmation is not sent again', async () => {
  let sent = 0
  const cause = new Error('Telemetry timeout')
  await assert.rejects(confirmedControl({type:'generator.start'},'token',async()=>{sent++},async()=>{throw cause}), error=>/accepted the command/.test(error.message) && error.cause === cause)
  assert.equal(sent,1)
})

test('rejected command preserves its error and never reads confirmation', async () => {
  const cause = new Error('Interlock rejected command')
  let reads = 0
  await assert.rejects(confirmedControl({},'token',async()=>{throw cause},async()=>{reads++}), error=>error === cause)
  assert.equal(reads,0)
})

test('confirmation uses the authenticated token and returns current state', async () => {
  const action = {type:'notification.acknowledge',id:'alert'}
  const state = {notifications:[]}
  assert.equal(await confirmedControl(action,'token',async(actual,token)=>{assert.equal(actual,action);assert.equal(token,'token')},async token=>{assert.equal(token,'token');return state}),state)
})
