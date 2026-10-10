import test from 'node:test'
import assert from 'node:assert/strict'
import { requestNotificationPermission } from './notificationPermission.js'

test('already granted permission does not open another prompt', async () => {
  assert.equal(await requestNotificationPermission({ permission: 'granted', requestPermission() { throw new Error('unexpected prompt') } }), 'granted')
})

test('notification permission preserves grant and denial results', async () => {
  for (const result of ['granted', 'denied', 'default']) {
    assert.equal(await requestNotificationPermission({ permission: 'default', requestPermission: async () => result }), result)
  }
})

test('an unanswered browser prompt releases the UI without assuming permission', async () => {
  let resolvePrompt
  const pending = new Promise(resolve => { resolvePrompt = resolve })
  await assert.rejects(requestNotificationPermission({ permission: 'default', requestPermission: () => pending }, 5), /still pending/)
  resolvePrompt('granted')
})

test('unavailable or rejected permission requests report failure', async () => {
  await assert.rejects(requestNotificationPermission(undefined), /unavailable/)
  await assert.rejects(requestNotificationPermission({ permission: 'default', requestPermission: async () => { throw new Error('blocked') } }), /blocked/)
})
