// Includes response-body reading so a stalled JSON transfer cannot hold the UI busy.
export async function requestControllerJson(url, options = {}, {timeoutMs = 10000} = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const changesState = method !== 'GET' && method !== 'HEAD'
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const response = await fetch(url, {...options, cache:'no-store', signal:abort.signal})
    if (!response.ok) {
      const error = new Error(`Controller request rejected (HTTP ${response.status}).`)
      error.status = response.status
      throw error
    }
    return await response.json()
  } catch (error) {
    if (abort.signal.aborted) {
      throw new Error(changesState
        ? 'Controller request timed out. The change may have been applied; reconnect and check its state before trying again.'
        : 'Controller request timed out. Check the connection and try again.')
    }
    if (changesState && !Number.isInteger(error?.status)) {
      throw new Error('Controller response could not be confirmed. The change may have been applied; reconnect and check its state before trying again.', {cause:error})
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
