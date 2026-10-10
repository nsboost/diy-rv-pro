import { normalizeAutomationRule } from './telemetryClient.js'
import { requestControllerJson } from './controllerRequest.js'

const utf8Size = value => new TextEncoder().encode(value).length
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const bounded = (value, min, max) => typeof value === 'string' && utf8Size(value) >= min && utf8Size(value) <= max && !value.includes('\0')

export function prepareAutomationRecovery(buffer) {
  const bytes = new Uint8Array(buffer)
  if (!bytes.length || bytes.length > 65537) throw new Error('Recovery file must contain at most 65,537 bytes.')
  let text
  try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes) }
  catch { throw new Error('Recovery file is not valid UTF-8. Keep the original and use a repaired JSON copy.') }
  if (text.endsWith('\0')) text = text.slice(0, -1)
  if (text.includes('\0')) throw new Error('Recovery file contains hidden bytes. Keep the original and use a repaired JSON copy.')
  let state
  try { state = JSON.parse(text) } catch { throw new Error('Recovery file is not valid JSON. Keep the original and repair a separate copy.') }
  const pending = [state]
  while (pending.length) {
    const value = pending.pop()
    if (typeof value === 'string' && value.includes('\0')) throw new Error('Recovery record contains an invalid null character.')
    if (value && typeof value === 'object') pending.push(...Object.keys(value), ...Object.values(value))
  }
  if (!object(state) || ![1,2].includes(state.version) || !Array.isArray(state.rules) || state.rules.length > 64 || !Array.isArray(state.notifications) || state.notifications.length > 64) throw new Error('Recovery record has an unsupported version or invalid lists.')
  const rules = state.rules.map(rule => {
    if (!object(rule) || typeof rule.id !== 'string') throw new Error('Every recovered rule needs its original identity.')
    for (const [part, keys] of [[rule.trigger,['source','label','operator','value','holdFor']], [rule.action,['category','type','target','targetLabel','command','commandLabel','value']], [rule.reverse,['source','operator','value','category','target','targetLabel','command','commandLabel','action','restoreValue']]]) {
      if (part !== undefined && !object(part) || keys.some(key => part?.[key] !== undefined && typeof part[key] !== 'string')) throw new Error('Recovered rule fields must use their original text types.')
    }
    return normalizeAutomationRule(rule)
  })
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) throw new Error('Recovered rule identities are duplicated.')
  if (state.version === 2) {
    const active = state.activeRuleIds
    if (!Array.isArray(active) || active.length > 64 || new Set(active).size !== active.length || active.some(id => typeof id !== 'string' || !rules.some(rule => rule.id === id && rule.enabled))) throw new Error('Recovery activation references are invalid.')
  }
  for (const alert of state.notifications) {
    if (!object(alert) || !bounded(alert.id,1,32) || !bounded(alert.message,1,256) || !bounded(alert.ruleId,0,32) || !['info','warning'].includes(alert.severity) || typeof alert.read !== 'boolean' || !Number.isFinite(alert.uptimeMs) || alert.uptimeMs < 0) throw new Error('Recovered alert history is invalid.')
  }
  if (new Set(state.notifications.map(alert => alert.id)).size !== state.notifications.length) throw new Error('Recovered alert identities are duplicated.')
  const record = {version:2, rules:rules.map(rule => ({...rule,enabled:false})), notifications:structuredClone(state.notifications), activeRuleIds:[]}
  if (utf8Size(JSON.stringify(record)) > 65536) throw new Error('Prepared recovery exceeds controller storage limits.')
  return record
}

export async function saveAutomationRecovery(record, token) {
  if (!token) throw new Error('Connect with the controller admin token before saving recovery.')
  // Revalidate immediately before transmission; always send disabled rules.
  const prepared = prepareAutomationRecovery(new TextEncoder().encode(JSON.stringify(record)))
  try {
    const response = await requestControllerJson('/api/automation/recovery', {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(prepared)})
    if (response?.saved !== true || response?.restartRequired !== true) throw new Error('Recovery confirmation is incomplete.')
    return response
  } catch (error) {
    if (error.status === 400 || error.status === 401) throw error
    throw new Error('Recovery could not be confirmed. Keep the original backup, reconnect and check controller state before retrying.', {cause:error})
  }
}
