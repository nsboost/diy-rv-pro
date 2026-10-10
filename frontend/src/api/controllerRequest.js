// Includes response-body reading so a stalled JSON transfer cannot hold the UI busy.
export async function requestControllerJson(url, options = {}, {timeoutMs = 10000} = {}) {
  return requestController(url, options, timeoutMs, response => response.json())
}

export async function requestControllerBackup(token) {
  if (!token) throw new Error('Connect with the controller admin token before downloading its saved automation data.')
  return requestController('/api/automation/backup', {headers:{Authorization:`Bearer ${token}`}}, 10000, async response => {
    if (response.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/octet-stream') throw new Error('Controller returned an invalid backup response.')
    const bytes = await response.arrayBuffer()
    if (!bytes.byteLength || bytes.byteLength > 65537) throw new Error('Controller backup size is invalid.')
    return bytes
  })
}

async function requestController(url, options, timeoutMs, readResponse) {
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
    return await readResponse(response)
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
