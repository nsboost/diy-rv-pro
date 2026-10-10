import test from 'node:test'
import assert from 'node:assert/strict'
import { createControlGate } from './controlGate.js'

test('overlapping commands are rejected without execution or later replay', async () => {
  const gate = createControlGate()
  let finish
  let secondCalls = 0
  const first = gate(() => new Promise(resolve => { finish = resolve }))
  await assert.rejects(gate(() => { secondCalls++; }), /This command was not sent/)
  finish('confirmed')
  assert.equal(await first, 'confirmed')
  assert.equal(secondCalls, 0)
  assert.equal(await gate(() => 'next'), 'next')
})

test('failed commands release the guard and preserve their original error', async () => {
  const gate = createControlGate()
  const failure = new Error('Confirmation unavailable')
  await assert.rejects(gate(async () => { throw failure }), error => error === failure)
  assert.equal(await gate(() => 'retry'), 'retry')
  await assert.rejects(gate(() => { throw failure }), error => error === failure)
  assert.equal(await gate(() => 'after synchronous failure'), 'after synchronous failure')
})
