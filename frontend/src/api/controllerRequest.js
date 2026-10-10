// Includes response-body reading so a stalled JSON transfer cannot hold the UI busy.
export async function requestControllerJson(url, options = {}, {timeoutMs = 10000} = {}) {
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const response = await fetch(url, {...options, signal:abort.signal})
    if (!response.ok) {
      const error = new Error(`Controller request rejected (HTTP ${response.status}).`)
      error.status = response.status
      throw error
    }
    return await response.json()
  } catch (error) {
    if (abort.signal.aborted) {
      const changesState = options.method && options.method !== 'GET'
      throw new Error(changesState
        ? 'Controller request timed out. The change may have been applied; reconnect and check its state before trying again.'
        : 'Controller request timed out. Check the connection and try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
