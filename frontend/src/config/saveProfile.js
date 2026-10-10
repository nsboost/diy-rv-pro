import { normalizeSystemProfile } from './systemProfile.js'

export function isStandaloneDemo({development, online, token, mode}) {
  return development === true && online === false && !token && mode === 'simulation'
}

export async function persistSystemProfile(profile, { demo = false, token, saveRemote }) {
  const normalized = normalizeSystemProfile(profile)
  if (demo) {
    return { profile: normalized, message: 'Demo configuration updated; saved in this browser when storage is available' }
  }
  if (!token) {
    throw new Error('Sign in to the controller before saving configuration')
  }
  const saved = await saveRemote({ features: normalized }, token)
  if (!saved?.features || saved.features.schemaVersion !== normalized.schemaVersion) {
    throw new Error('Controller did not return a valid saved configuration; reload to verify')
  }
  return {
    profile: normalizeSystemProfile(saved.features),
    message: saved.temperatureInputsRequireRestart ? 'Configuration saved. Restart controller to apply temperature buses, then discover sensors.' : 'Configuration saved to controller; commissioning still required'
  }
}
