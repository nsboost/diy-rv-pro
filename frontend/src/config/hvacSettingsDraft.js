export function parseHvacSettingsDraft(draft) {
  const settings = {mode:draft.mode}
  for (const [key,label] of [['coolSetpointF','AC set point'],['heatSetpointF','Heat set point'],['autoDifferentialF','Auto differential'],['sensorOffsetF','Sensor offset']]) {
    const value = draft[key]
    if (typeof value !== 'number' && typeof value !== 'string' || typeof value === 'string' && !value.trim() || !Number.isFinite(Number(value))) throw new Error(`Enter a numeric ${label.toLowerCase()}.`)
    settings[key] = Number(value)
  }
  return settings
}
