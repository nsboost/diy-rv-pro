export function clearAdminToken(storages) {
  let failed = false
  for (const getStorage of storages) {
    try { getStorage().removeItem('diy-rv-admin-token') }
    catch { failed = true }
  }
  if (failed) throw new Error('Sign-out could not clear all saved credentials. Clear this site\'s browser storage before leaving the controller unattended.')
}
