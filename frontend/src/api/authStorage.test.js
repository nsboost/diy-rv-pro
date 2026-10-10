import test from 'node:test'
import assert from 'node:assert/strict'
import {clearAdminToken} from './authStorage.js'

test('sign-out attempts both token stores even when one is inaccessible', () => {
  let cleared = false
  assert.throws(() => clearAdminToken([
    () => {throw new Error('Access denied')},
    () => ({removeItem:key => {assert.equal(key,'diy-rv-admin-token');cleared = true}})
  ]), /could not clear all saved credentials/)
  assert.equal(cleared,true)
})

test('sign-out removes only the admin credential from each store', () => {
  const session = new Map([['diy-rv-admin-token','session'],['inventory','keep']])
  const local = new Map([['diy-rv-admin-token','remembered'],['rules','keep']])
  clearAdminToken([() => ({removeItem:key=>session.delete(key)}),() => ({removeItem:key=>local.delete(key)})])
  assert.equal(session.has('diy-rv-admin-token'),false)
  assert.equal(local.has('diy-rv-admin-token'),false)
  assert.equal(session.get('inventory'),'keep')
  assert.equal(local.get('rules'),'keep')
})
