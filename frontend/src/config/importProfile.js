import {normalizeSystemProfile} from './systemProfile.js'
import {validateProfile} from './validateProfile.js'
export function importProfileJson(text) {
  if (new TextEncoder().encode(text).length > 24576) throw new Error('Configuration file exceeds the controller limit')
  let raw
  try {raw = JSON.parse(text)} catch {throw new Error('Configuration file must contain valid JSON')}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== 1) throw new Error('Unsupported configuration version')
  const issues = validateProfile(raw)
  if (issues.length) throw new Error(issues.join('; '))
  return normalizeSystemProfile(raw)
}

export function exportProfileJson(profile) {
  const text = JSON.stringify(profile)
  importProfileJson(text)
  return text
}
