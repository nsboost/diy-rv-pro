export function ruleStatus(rule, state, catalog) {
  if (!rule.enabled) return 'Disabled'
  if (state?.error) return `Action pending: ${state.error}`
  if (catalog) {
    const hasSource = source => catalog.sources.some(([id]) => id === source)
    const hasAction = action => catalog.systems.some(system => system.id === action?.target && system.commands.includes(action.command))
    if (!hasSource(rule.trigger?.source)) return 'Needs configuration: trigger source unavailable'
    if (!hasAction(rule.action)) return 'Needs configuration: action unavailable'
    if (rule.reverse?.enabled && !hasSource(rule.reverse.source)) return 'Needs configuration: restore source unavailable'
    if (rule.reverse?.enabled && !hasAction(rule.reverse)) return 'Needs configuration: restore action unavailable'
  }
  if (!state) return 'Waiting for evaluator'
  if (state.active) return 'Triggered'
  if (state.holding || Number.isFinite(state.since)) return 'Holding trigger'
  if (state.sourceAvailable === false) return 'Waiting for valid input'
  return 'Watching trigger'
}
