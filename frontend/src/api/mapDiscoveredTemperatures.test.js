import test from 'node:test'
import assert from 'node:assert/strict'
import {mapDiscoveredTemperatures} from './mapDiscoveredTemperatures.js'
test('discovery mapping requires a unique addressed enabled sensor and explicit age',()=>{
  const sensor = {id:'living',enabled:true,sensorType:'ds18b20',busId:'bus',address:'28AB'}
  const device = {busId:'bus',address:'28ab',ageMs:100,status:'ok',tempF:72}
  assert.equal(mapDiscoveredTemperatures([device],[sensor],1000)[0].sampledAt,900)
  assert.deepEqual(mapDiscoveredTemperatures([device,device],[sensor],1000),[])
  assert.deepEqual(mapDiscoveredTemperatures(null,[sensor],1000),[])
  assert.deepEqual(mapDiscoveredTemperatures([device],[{...sensor,enabled:false}],1000),[])
  assert.deepEqual(mapDiscoveredTemperatures([{...device,busId:'other'}],[sensor],1000),[])
  assert.equal(mapDiscoveredTemperatures([{...device,ageMs:undefined}],[sensor],1000)[0].sampledAt,null)
})
