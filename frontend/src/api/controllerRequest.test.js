import test from 'node:test'
import assert from 'node:assert/strict'
import {requestControllerJson, requestControllerBackup} from './controllerRequest.js'

test('automation backup preserves corrupt binary bytes and uses authenticated uncached GET', async () => {
  const original = globalThis.fetch
  const bytes = new Uint8Array([0, 255, 123, 0, 128])
  let calls = 0
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(url, '/api/automation/backup')
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.method, undefined)
    return new Response(bytes, {headers:{'Content-Type':'application/octet-stream'}})
  }
  try {
    await assert.rejects(requestControllerBackup(''), /admin token/)
    assert.equal(calls, 0)
    assert.deepEqual(new Uint8Array(await requestControllerBackup('test-token')), bytes)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})

test('automation backup rejects missing, oversized or nonbinary payloads', async () => {
  const original = globalThis.fetch
  try {
    for (const [body, type] of [[new Uint8Array(0),'application/octet-stream'], [new Uint8Array(65538),'application/octet-stream'], ['<html>','text/html']]) {
      globalThis.fetch = async () => new Response(body, {headers:{'Content-Type':type}})
      await assert.rejects(requestControllerBackup('test-token'), /invalid/)
    }
  } finally { globalThis.fetch = original }
})

test('automation backup stops oversized streaming responses without reading the rest', async () => {
  const original = globalThis.fetch
  let cancelled = false
  let chunksRead = 0
  globalThis.fetch = async () => new Response(new ReadableStream({
    pull(controller) { chunksRead++; controller.enqueue(new Uint8Array(40000)) },
    cancel() { cancelled = true },
  }), {headers:{'Content-Type':'application/octet-stream'}})
  try {
    await assert.rejects(requestControllerBackup('test-token'), /size is invalid/)
    assert.equal(cancelled, true)
    assert.ok(chunksRead <= 3)
  } finally { globalThis.fetch = original }
})

test('automation backup rejects invalid declared sizes and truncated content', async () => {
  const original = globalThis.fetch
  try {
    for (const declared of ['0', '65538', '-1', 'invalid', '3']) {
      globalThis.fetch = async () => new Response(new Uint8Array([1,2]), {headers:{'Content-Type':'application/octet-stream','Content-Length':declared}})
      await assert.rejects(requestControllerBackup('test-token'), /size is invalid/)
    }
    globalThis.fetch = async () => new Response(new Uint8Array([1,2]), {headers:{'Content-Type':'application/octet-stream','Content-Length':'2'}})
    assert.deepEqual(new Uint8Array(await requestControllerBackup('test-token')), new Uint8Array([1,2]))
  } finally { globalThis.fetch = original }
})

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
    await assert.rejects(requestControllerJson('/api/control',{method:'POST'}), error => error.status === 401 && /HTTP 401/.test(error.message) && !/may have been applied/.test(error.message))
  } finally {globalThis.fetch = original}
})

test('connection loss and unreadable mutation response report uncertain application without retries', async () => {
  const original = globalThis.fetch
  for (const unreadableBody of [false,true]) {
    let calls = 0
    const cause = new Error('Connection lost')
    globalThis.fetch = async () => {
      calls++
      if (!unreadableBody) throw cause
      return {ok:true,json:async()=>{throw cause}}
    }
    try {
      await assert.rejects(requestControllerJson('/api/config',{method:'put'}), error=>/may have been applied/.test(error.message) && error.cause === cause)
      assert.equal(calls,1)
    } finally {globalThis.fetch = original}
  }
})

test('read failures retain their original error', async () => {
  const original = globalThis.fetch
  const cause = new Error('Connection lost')
  globalThis.fetch = async () => {throw cause}
  try {
    await assert.rejects(requestControllerJson('/api/telemetry'),error=>error === cause)
  } finally {globalThis.fetch = original}
})

test('controller state requests bypass browser caches while preserving authentication', async () => {
  const original = globalThis.fetch
  const headers = {Authorization:'Bearer test-token'}
  globalThis.fetch = async (url,options) => {
    assert.equal(options.cache,'no-store')
    assert.equal(options.headers,headers)
    assert.ok(options.signal instanceof AbortSignal)
    return {ok:true,json:async()=>({current:true})}
  }
  try {
    assert.deepEqual(await requestControllerJson('/api/telemetry',{headers,cache:'force-cache'}),{current:true})
  } finally {globalThis.fetch = original}
})
