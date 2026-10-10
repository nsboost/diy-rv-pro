import test from 'node:test'
import assert from 'node:assert/strict'
import {cloneTelemetry} from '../data/mockTelemetry.js'
import {prepareAutomationRecovery,saveAutomationRecovery} from './automationRecovery.js'

const encode = value => new TextEncoder().encode(JSON.stringify(value))
const fixture = () => {
  const rule = structuredClone(cloneTelemetry().automationRules[0])
  return {version:2,rules:[rule],activeRuleIds:rule.enabled ? [rule.id] : [],notifications:[{id:'alert-1',ruleId:rule.id,message:'Warm bedroom',severity:'warning',read:false,uptimeMs:1000}]}
}
test('recovery review preserves alerts, disables rules and leaves the original unchanged', () => {
  const original = fixture(), before = structuredClone(original)
  const bytes = encode(original)
  const blob = new Uint8Array(bytes.length+1); blob.set(bytes)
  const prepared = prepareAutomationRecovery(blob)
  assert.equal(prepared.rules[0].enabled,false)
  assert.deepEqual(prepared.activeRuleIds,[])
  assert.deepEqual(prepared.notifications,original.notifications)
  assert.deepEqual(original,before)
  original.version=1; delete original.activeRuleIds
  assert.equal(prepareAutomationRecovery(encode(original)).version,2)
})
test('recovery rejects corrupt bytes, unsafe references and malformed stored fields', () => {
  for (const bytes of [new Uint8Array(0),new Uint8Array(65538),new Uint8Array([255]),new Uint8Array([123,0,125,0]),new TextEncoder().encode('not json')]) assert.throws(()=>prepareAutomationRecovery(bytes))
  for (const change of [state=>{state.version=9},state=>{state.rules[0].id=undefined},state=>{state.rules.push(structuredClone(state.rules[0]))},state=>{state.activeRuleIds=['missing']},state=>{state.notifications[0].read='false'},state=>{state.notifications[0].message='bad\0suffix'},state=>{state.rules[0].trigger.source={name:'temperature'}},state=>{state.notifications.push(structuredClone(state.notifications[0]))}]) {
    const state=fixture(); change(state); assert.throws(()=>prepareAutomationRecovery(encode(state)))
  }
})
test('recovery saves only disabled records with authentication and explicit restart confirmation', async () => {
  const originalFetch=globalThis.fetch
  let calls=0
  globalThis.fetch=async(url,options)=>{
    calls++; assert.equal(url,'/api/automation/recovery');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer test-token')
    const sent=JSON.parse(options.body);assert.equal(sent.rules[0].enabled,false);assert.deepEqual(sent.activeRuleIds,[])
    return new Response(JSON.stringify({saved:true,restartRequired:true}))
  }
  try {
    await assert.rejects(saveAutomationRecovery(fixture(),''),/admin token/);assert.equal(calls,0)
    assert.equal((await saveAutomationRecovery(fixture(),'test-token')).saved,true)
    globalThis.fetch=async()=>new Response(JSON.stringify({saved:true}))
    await assert.rejects(saveAutomationRecovery(fixture(),'test-token'),/could not be confirmed/)
    globalThis.fetch=async()=>new Response('failed',{status:500})
    await assert.rejects(saveAutomationRecovery(fixture(),'test-token'),/check controller state before retrying/)
  } finally {globalThis.fetch=originalFetch}
})
