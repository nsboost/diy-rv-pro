export function clearAdminToken(storages) {
  let failed = false
  for (const getStorage of storages) {
    try { getStorage().removeItem('diy-rv-admin-token') }
    catch { failed = true }
  }
  if (failed) throw new Error('Sign-out could not clear all saved credentials. Clear this site\'s browser storage before leaving the controller unattended.')
}

export function storeAdminToken(value, remember, getSessionStorage, getLocalStorage) {
  const key = 'diy-rv-admin-token'
  let session, local, previousSession, previousLocal
  try {
    session = getSessionStorage()
    local = getLocalStorage()
    previousSession = session.getItem(key)
    previousLocal = local.getItem(key)
  } catch {
    throw new Error('Browser credential storage is unavailable. Existing saved credentials were not changed.')
  }
  const selected = remember ? local : session
  const other = remember ? session : local
  try {
    selected.setItem(key, value)
    other.removeItem(key)
  } catch {
    let restored = true
    for (const [storage, previous] of [[session, previousSession], [local, previousLocal]]) {
      try {
        if (storage.getItem(key) === previous) continue
        if (previous === null) storage.removeItem(key)
        else storage.setItem(key, previous)
      } catch { restored = false }
    }
    throw new Error(restored
      ? 'Could not save the controller credential. Previous saved credentials were restored.'
      : 'Could not save or restore all controller credentials. Clear this site browser storage before leaving the controller unattended.')
  }
}

export function readAdminToken(storages) {
  for (const getStorage of storages) {
    try {
      const token = getStorage().getItem('diy-rv-admin-token')
      if (typeof token === 'string' && token) return token
    } catch { /* Another credential store may still be available. */ }
  }
  return ''
}
