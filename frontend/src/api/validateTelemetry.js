const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
export function validateTelemetry(value) {
  const reject = () => {throw new Error('Controller returned invalid telemetry. Check firmware compatibility and reconnect.')}
  if (!object(value)) reject()
  for (const key of ['controller','wifi','time','battery','solar','loads','shorePower','inverter','weather','generator']) {
    if (!object(value[key])) reject()
  }
  for (const key of ['hvacZones','tanks','automationRules','events','powerHistory']) {
    if (!Array.isArray(value[key]) || value[key].some(item => !object(item))) reject()
  }
  if (value.systemStatus !== undefined && (!Array.isArray(value.systemStatus) || value.systemStatus.some(item => !Array.isArray(item) || item.length !== 2 || item.some(part => typeof part !== 'string')))) reject()
  for (const key of ['notifications','temperatures','securityInputs']) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].some(item => !object(item)))) reject()
  }
  if (value.ruleRuntime !== undefined && !object(value.ruleRuntime)) reject()
  if (value.storageError !== undefined && typeof value.storageError !== 'string') reject()
  return value
}
