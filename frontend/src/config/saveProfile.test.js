import test from 'node:test'
import assert from 'node:assert/strict'
import { persistSystemProfile, isStandaloneDemo } from './saveProfile.js'
import { defaultSystemProfile } from './systemProfile.js'

test('device save requires authentication and never falls back to demo', async () => {
  let called = false
  await assert.rejects(persistSystemProfile(defaultSystemProfile, {
    saveRemote: async () => { called = true }
  }), /Sign in/)
  assert.equal(called, false)
})

test('failed device save preserves the submitted profile and rejects', async () => {
  const profile = structuredClone(defaultSystemProfile)
  const before = structuredClone(profile)
  await assert.rejects(persistSystemProfile(profile, {
    token: 'test-token', saveRemote: async () => { throw new Error('Connection lost') }
  }), /Connection lost/)
  assert.deepEqual(profile, before)
})

test('successful save uses controller-confirmed configuration', async () => {
  const confirmed = structuredClone(defaultSystemProfile)
  confirmed.rvProfile.name = 'Controller name'
  const result = await persistSystemProfile(defaultSystemProfile, {
    token: 'test-token', saveRemote: async (request, token) => {
      assert.equal(token, 'test-token')
      assert.equal(request.features.schemaVersion, 1)
      return { features: confirmed }
    }
  })
  assert.equal(result.profile.rvProfile.name, 'Controller name')
  assert.match(result.message, /commissioning still required/)
})

test('invalid acknowledgement does not report successful persistence', async () => {
  await assert.rejects(persistSystemProfile(defaultSystemProfile, {
    token: 'test-token', saveRemote: async () => ({})
  }), /reload to verify/)
})

test('explicit demo save is labeled and never contacts a controller', async () => {
  const result = await persistSystemProfile(defaultSystemProfile, {
    demo: true, saveRemote: async () => { throw new Error('Unexpected request') }
  })
  assert.match(result.message, /Demo.*this browser/)
})

test('only an explicit standalone simulation can save demo configuration', () => {
  const session = {development:true,online:false,token:'',mode:'simulation'}
  assert.equal(isStandaloneDemo(session),true)
  for (const mode of ['device',undefined,'prototype']) assert.equal(isStandaloneDemo({...session,mode}),false)
  assert.equal(isStandaloneDemo({...session,online:true}),false)
  assert.equal(isStandaloneDemo({...session,token:'saved-token'}),false)
  assert.equal(isStandaloneDemo({...session,development:false}),false)
})

test('configuration feedback includes every input group requiring restart', async () => {
  for (const [temperature,security,label] of [[true,false,'temperature buses'],[false,true,'security inputs'],[true,true,'temperature buses and security inputs']]) {
    const result = await persistSystemProfile(defaultSystemProfile,{token:'test',saveRemote:async()=>({features:defaultSystemProfile,temperatureInputsRequireRestart:temperature,securityInputsRequireRestart:security})})
    assert.ok(result.message.includes(label))
    assert.match(result.message,/Restart controller/)
    assert.equal(result.message.includes('discover temperature'),temperature)
  }
})
