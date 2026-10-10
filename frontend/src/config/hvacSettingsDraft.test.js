import test from 'node:test'
import assert from 'node:assert/strict'
import {parseHvacSettingsDraft} from './hvacSettingsDraft.js'
const draft = {mode:'Off',coolSetpointF:'72',heatSetpointF:'66',autoDifferentialF:'3',sensorOffsetF:'0'}
test('HVAC form requires explicit numbers while preserving zero and negative offsets',()=>{
  assert.equal(parseHvacSettingsDraft(draft).sensorOffsetF,0)
  assert.equal(parseHvacSettingsDraft({...draft,sensorOffsetF:'-1.5'}).sensorOffsetF,-1.5)
  for (const key of ['coolSetpointF','heatSetpointF','autoDifferentialF','sensorOffsetF']) {
    for (const value of ['', ' ', null, undefined, false, 'invalid', Infinity]) assert.throws(()=>parseHvacSettingsDraft({...draft,[key]:value}), /Enter a numeric/)
  }
})
