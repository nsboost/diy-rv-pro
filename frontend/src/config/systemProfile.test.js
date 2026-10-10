import assert from 'node:assert/strict'
import test from 'node:test'
import { createProfileItem, normalizeSystemProfile, defaultSystemProfile } from './systemProfile.js'

test('new item identities do not depend on list length', () => {
  const items = Array.from({ length: 100 }, () => createProfileItem('waterTanks', 1))
  assert.equal(new Set(items.map(item => item.id)).size, items.length)
  for (const item of items) assert.match(item.id, /^[0-9a-f]{32}$/)
})

test('normalization preserves IDs without sharing editable item objects', () => {
  const source = structuredClone(defaultSystemProfile)
  source.waterTanks.push(createProfileItem('waterTanks'))
  const normalized = normalizeSystemProfile(source)
  assert.equal(normalized.waterTanks[0].id, source.waterTanks[0].id)
  normalized.waterTanks[0].label = 'Changed'
  assert.notEqual(normalized.waterTanks[0].label, source.waterTanks[0].label)
})
