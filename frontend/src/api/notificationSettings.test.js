import test from 'node:test'
import assert from 'node:assert/strict'
import { loadNotificationSettings, saveNotificationSettings } from './notificationSettings.js'

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

test('notification preference writes fail without changing effective choices', () => {
  const current = {inApp:true, desktop:false}
  let stored
  const storage = {setItem: (key, value) => { stored = value }}
  assert.deepEqual(saveNotificationSettings(storage,current,{inApp:false}), {inApp:false,desktop:false})
  assert.deepEqual(JSON.parse(stored),{inApp:false,desktop:false})
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.throws(() => saveNotificationSettings(storage,current,{desktop:true}), /could not be saved/)
  assert.deepEqual(current,{inApp:true,desktop:false})
})
