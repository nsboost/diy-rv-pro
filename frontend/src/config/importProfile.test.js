import test from 'node:test'
import assert from 'node:assert/strict'
import {importProfileJson, exportProfileJson} from './importProfile.js'
import {defaultSystemProfile} from './systemProfile.js'
test('imports validate raw inventory before defaults can hide malformed fields',()=>{
  assert.equal(importProfileJson(JSON.stringify(defaultSystemProfile)).schemaVersion,1)
  assert.throws(()=>importProfileJson('{'),/valid JSON/)
  assert.throws(()=>importProfileJson('null'),/Unsupported/)
  assert.throws(()=>importProfileJson(JSON.stringify({...defaultSystemProfile,hvacZones:'bad'})),/inventory list/)
  assert.throws(()=>importProfileJson(JSON.stringify({...defaultSystemProfile,securitySensors:[{id:'door',label:'Door',enabled:'false'}]})),/enabled must/)
  assert.throws(()=>importProfileJson(' '.repeat(24577)),/controller limit/)
})

test('exported configuration round trips through raw import validation', () => {
  const text = exportProfileJson(defaultSystemProfile)
  assert.equal(text, JSON.stringify(defaultSystemProfile))
  assert.deepEqual(importProfileJson(text), importProfileJson(JSON.stringify(defaultSystemProfile)))
  assert.throws(() => exportProfileJson({...defaultSystemProfile, schemaVersion:2}), /Unsupported/)
  assert.throws(() => exportProfileJson({...defaultSystemProfile, rvProfile:{...defaultSystemProfile.rvProfile,name:'x'.repeat(24577)}}), /controller limit/)
})
