import test from 'node:test'
import assert from 'node:assert/strict'
import {mapSecurityInputs} from './mapSecurityInputs.js'
test('contact mapping requires unique enabled identity and preserves healthy false',()=>{
  const sensor={id:'door',label:'Entry Door',enabled:true}
  const reading={id:'door',status:'ok',active:false}
  assert.equal(mapSecurityInputs([reading],[sensor],1000)[0].active,false)
  assert.deepEqual(mapSecurityInputs([reading,reading],[sensor],1000),[])
  assert.deepEqual(mapSecurityInputs([null],[sensor],1000),[])
  assert.deepEqual(mapSecurityInputs([reading],[{...sensor,enabled:false}],1000),[])
  assert.deepEqual(mapSecurityInputs(null,[sensor],1000),[])
  assert.equal(mapSecurityInputs([{...reading,active:'false'}],[sensor],1000)[0].active,null)
  assert.equal(mapSecurityInputs([{...reading,status:'stale'}],[sensor],1000)[0].active,null)
})
