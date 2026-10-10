import test from 'node:test'
import assert from 'node:assert/strict'
import {clearAdminToken, storeAdminToken} from './authStorage.js'

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

function tokenStorage(initial = null) {
  const values = new Map(initial === null ? [] : [['diy-rv-admin-token', initial]])
  return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value), removeItem:key => values.delete(key)}
}

test('failed replacement write preserves the existing credential', () => {
  const session = tokenStorage('working-session'), local = tokenStorage()
  local.setItem = () => {throw new Error('Quota exceeded')}
  assert.throws(() => storeAdminToken('replacement',true,()=>session,()=>local), /Previous saved credentials were restored/)
  assert.equal(session.getItem('diy-rv-admin-token'),'working-session')
  assert.equal(local.getItem('diy-rv-admin-token'),null)
})

test('failure clearing the other store rolls back the replacement', () => {
  const session = tokenStorage('session'), local = tokenStorage('remembered')
  session.removeItem = () => {throw new Error('Access denied')}
  assert.throws(() => storeAdminToken('replacement',true,()=>session,()=>local), /Previous saved credentials were restored/)
  assert.equal(session.getItem('diy-rv-admin-token'),'session')
  assert.equal(local.getItem('diy-rv-admin-token'),'remembered')
})

test('successful credential storage keeps only the selected persistence scope', () => {
  for (const remember of [true,false]) {
    const session = tokenStorage('session'), local = tokenStorage('remembered')
    storeAdminToken('replacement',remember,()=>session,()=>local)
    assert.equal(session.getItem('diy-rv-admin-token'),remember ? null : 'replacement')
    assert.equal(local.getItem('diy-rv-admin-token'),remember ? 'replacement' : null)
  }
})

test('inaccessible storage leaves the existing credential untouched', () => {
  const session = tokenStorage('working')
  assert.throws(() => storeAdminToken('replacement',false,()=>session,()=>{throw new Error('Denied')}), /were not changed/)
  assert.equal(session.getItem('diy-rv-admin-token'),'working')
})

test('failed rollback reports that credential storage needs attention', () => {
  const session = tokenStorage('session'), local = tokenStorage('remembered')
  const write = local.setItem
  local.setItem = (key,value) => {if(value === 'remembered') throw new Error('Rollback denied');write(key,value)}
  session.removeItem = () => {throw new Error('Clear denied')}
  assert.throws(() => storeAdminToken('replacement',true,()=>session,()=>local), /Could not save or restore all controller credentials/)
})
