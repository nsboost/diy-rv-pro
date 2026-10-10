import test from 'node:test'
import assert from 'node:assert/strict'
import {requestControllerJson} from './controllerRequest.js'

test('controller timeout includes stalled body reading and never retries a mutation', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (url, options) => {
    calls++
    return {ok:true,json:()=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}))}
  }
  try {
    await assert.rejects(requestControllerJson('/api/control',{method:'POST'},{timeoutMs:5}), /may have been applied/)
    assert.equal(calls,1)
    await assert.rejects(requestControllerJson('/api/telemetry',{}, {timeoutMs:5}), /Check the connection/)
  } finally {globalThis.fetch = original}
})

test('controller JSON returns confirmed data and reports rejection status', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => ({ok:true,json:async()=>({saved:true})})
  try {
    assert.deepEqual(await requestControllerJson('/api/config'),{saved:true})
    globalThis.fetch = async () => ({ok:false,status:401})
    await assert.rejects(requestControllerJson('/api/config'), error => error.status === 401 && /HTTP 401/.test(error.message))
  } finally {globalThis.fetch = original}
})
