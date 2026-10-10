import test from 'node:test'
import assert from 'node:assert/strict'
import { persistSystemProfile } from './saveProfile.js'
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
