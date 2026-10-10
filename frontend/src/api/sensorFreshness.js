// Request-start time is a conservative bound: transport delay cannot refresh an old sample.
export function sampledAtFromRequest(requestStartedAt, ageMs = 0) {
  if (!Number.isFinite(requestStartedAt) || requestStartedAt < 0 || typeof ageMs !== 'number' || !Number.isFinite(ageMs) || ageMs < 0) return null
  const sampledAt = requestStartedAt - ageMs
  return sampledAt >= 0 ? sampledAt : null
}
