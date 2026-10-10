const operators = new Set(['=', '!=', '>', '>=', '<', '<=', 'between', 'outside', 'changes'])

export function durationMs(value = '0 min') {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|min|minutes?|h|hours?)$/i)
  if (!match) throw new Error('Hold duration must use seconds, minutes, or hours')
  const result = Number(match[1]) * (/^h/i.test(match[2]) ? 3600000 : /^m/i.test(match[2]) ? 60000 : 1000)
  if (result > 86400000) throw new Error('Hold duration cannot exceed 24 hours')
  return result
}

function scalar(value) {
  if (['on', 'true', 'connected', 'running'].includes(String(value).toLowerCase())) return true
  if (['off', 'false', 'disconnected', 'stopped'].includes(String(value).toLowerCase())) return false
  if (String(value).trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return value
}

function timeMinute(value) {
  const match = String(value).match(/^(\d{2}):(\d{2})$/)
  if (!match || +match[1] > 23 || +match[2] > 59) throw new Error('Use time values in HH:MM format')
  return +match[1] * 60 + +match[2]
}

export function validateCondition(condition) {
  if (!condition?.source || !operators.has(condition.operator)) throw new Error('Select a source and comparison')
  if (condition.operator === 'changes') return
  if (condition.value === undefined || String(condition.value).trim() === '') throw new Error('Comparison value is required')
  if (['between', 'outside'].includes(condition.operator)) {
    if (condition.source === 'time.local') {
      const range = String(condition.value).split('-')
      if (range.length !== 2) throw new Error('Time range must use HH:MM-HH:MM')
      range.forEach(timeMinute)
    } else {
      const parts = String(condition.value).split(',').map(value => value.trim())
      const range = parts.map(Number)
      if (parts.length !== 2 || parts.some(value => value === '') || !range.every(Number.isFinite) || range[0] >= range[1]) throw new Error('Range must use two increasing numbers, such as 65,75')
    }
  } else if (condition.source === 'time.local') {
    timeMinute(condition.value)
  } else if (['>', '>=', '<', '<='].includes(condition.operator) && !Number.isFinite(Number(condition.value))) {
    throw new Error('Numeric comparisons require a number')
  }
}

export function compareCondition(condition, value, previous) {
  if (value === undefined || value === null || (typeof value === 'number' && !Number.isFinite(value))) return false
  if (condition.operator === 'changes') return previous !== undefined && value !== previous
  if (['between', 'outside'].includes(condition.operator)) {
    if (typeof value !== 'number') return false
    let within
    if (condition.source === 'time.local') {
      const [start, end] = String(condition.value).split('-').map(timeMinute)
      within = start <= end ? value >= start && value <= end : value >= start || value <= end
    } else {
      const [low, high] = String(condition.value).split(',').map(Number)
      within = typeof value === 'number' && value >= low && value <= high
    }
    return condition.operator === 'between' ? within : !within
  }
  const expected = condition.source === 'time.local' ? timeMinute(condition.value) : scalar(condition.value)
  if (condition.operator === '=') return value === expected
  if (condition.operator === '!=') return value !== expected
  if (typeof value !== 'number' || typeof expected !== 'number') return false
  return ({ '>': value > expected, '>=': value >= expected, '<': value < expected, '<=': value <= expected })[condition.operator] || false
}

export function readAutomationSource(telemetry, source, now) {
  if (source === 'time.local' && Number.isFinite(telemetry.localMinute)) return telemetry.localMinute
  if (source === 'time.local') { const time = new Date(now); return time.getHours() * 60 + time.getMinutes() }
  const parts = source.split('.')
  if (parts[0] === 'temperature') {
    const reading = telemetry.temperatures?.find(sensor => sensor.id === parts[1])
    return reading?.status === 'ok' && Number.isFinite(reading.sampledAt) && now >= reading.sampledAt && now - reading.sampledAt <= 30000 ? reading.tempF : undefined
  }
  if (parts[0] === 'hvac') {
    const zone = telemetry.hvacZones?.find(zone => zone.id === parts[1])
    return zone?.sensorStatus && zone.sensorStatus !== 'ok' ? undefined : zone?.[parts[2]]
  }
  if (parts[0] === 'tank') return telemetry.tanks?.find(tank => tank.id === parts[1])?.[parts[2]]
  if (parts[0] === 'device' && parts.at(-1) === 'state') return telemetry.outputStates?.[parts.slice(0,-1).join('.')]
  if (parts[0] === 'breaker') return telemetry.circuits?.[`${parts[1]}.${parts[2]}`]
  if (parts.length === 2 && ['battery', 'solar', 'loads', 'shorePower', 'generator', 'inverter'].includes(parts[0])) return telemetry[parts[0]]?.[parts[1]]
  return undefined
}

// Edge-triggered evaluation with per-rule hold clocks and one restore per activation.
// The caller owns execution and authorization; this evaluator never touches hardware.
export function evaluateRules(rules, telemetry, runtime, now) {
  const actions = []
  for (const rule of rules) {
    const state = runtime[rule.id] ||= { active: false, since: null }
    if (!rule.enabled) { state.since = null; state.active = false; continue }
    if (state.retryAt && now < state.retryAt) continue
    try {
      validateCondition(rule.trigger)
      const value = readAutomationSource(telemetry, rule.trigger.source, now)
      state.sourceAvailable = value !== undefined && value !== null && (typeof value !== 'number' || Number.isFinite(value))
      const matches = compareCondition(rule.trigger, value, state.previous)
      state.previous = value
      if (state.active && rule.reverse?.enabled) {
        validateCondition(rule.reverse)
        const restore = readAutomationSource(telemetry, rule.reverse.source, now)
        if (compareCondition(rule.reverse, restore, state.previousRestore)) {
          actions.push({ rule, action: { ...rule.reverse, value: rule.reverse.restoreValue }, restoring: true })
          state.active = false; state.since = null
        }
        state.previousRestore = restore
      } else if (!state.active && matches) {
        state.since ??= now
        if (now - state.since >= durationMs(rule.trigger.holdFor)) {
          actions.push({ rule, action: rule.action, restoring: false })
          state.active = true
        }
      } else if (!matches) {
        state.since = null
        if (!rule.reverse?.enabled) state.active = false
      }
      state.error = ''
    } catch (error) { state.error = error.message; state.since = null }
  }
  // Apply blocking rules before equipment actions regardless of editor list order.
  return actions.sort((a, b) => Number(b.action.command?.startsWith('block')) - Number(a.action.command?.startsWith('block')))
}
