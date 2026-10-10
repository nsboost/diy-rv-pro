import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNotificationSettings } from './notificationSettings.js'

test('saved notification choices survive mode changes without enabling malformed preferences', () => {
  const storage = { getItem: () => JSON.stringify({ inApp: false, desktop: true }) }
  assert.deepEqual(loadNotificationSettings(storage, { inApp: true, desktop: false }), { inApp: false, desktop: true })
  storage.getItem = () => JSON.stringify({ inApp: 'false', desktop: 'true' })
  assert.deepEqual(loadNotificationSettings(storage), { inApp: true, desktop: false })
  storage.getItem = () => '{'
  assert.deepEqual(loadNotificationSettings(storage, { inApp: false, desktop: false }), { inApp: false, desktop: false })
  storage.getItem = () => { throw new Error('Storage unavailable') }
  assert.deepEqual(loadNotificationSettings(storage), { inApp: true, desktop: false })
})
