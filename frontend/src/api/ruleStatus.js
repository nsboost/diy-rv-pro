export function ruleStatus(rule, state) {
  if (!rule.enabled) return 'Disabled'
  if (!state) return 'Waiting for evaluator'
  if (state.error) return `Action pending: ${state.error}`
  if (state.active) return 'Triggered'
  if (state.holding || Number.isFinite(state.since)) return 'Holding trigger'
  if (state.sourceAvailable === false) return 'Waiting for valid input'
  return 'Watching trigger'
}
