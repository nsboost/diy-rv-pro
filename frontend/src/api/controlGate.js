// Reject overlapping commands instead of queuing actions that may become stale.
export function createControlGate() {
  let pending = false
  let revision = 0
  const run = async operation => {
    if (pending) throw new Error('Another controller command is awaiting confirmation. Wait for it to finish before trying again. This command was not sent.')
    pending = true
    revision++
    try {
      return await operation()
    } finally {
      pending = false
      revision++
    }
  }
  run.captureRevision = () => revision
  run.canApplyRefresh = captured => !pending && captured === revision
  return run
}
