// A successful command response and refreshed equipment state are separate evidence.
export async function confirmedControl(action, token, send, readTelemetry) {
  await send(action, token)
  try { return await readTelemetry(token) }
  catch (cause) {
    throw new Error('Controller accepted the command, but refreshed state could not be read. Verify controller state before sending it again.', {cause})
  }
}
