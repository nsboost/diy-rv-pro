import {sampledAtFromRequest} from './sensorFreshness.js'
export function mapSecurityInputs(readings, configured, requestStartedAt) {
  if (!Array.isArray(readings)) return []
  return configured.filter(sensor=>sensor.enabled).flatMap(sensor=>{
    const matches = readings.filter(reading=>reading && reading.id === sensor.id)
    if (matches.length !== 1) return []
    const reading = matches[0]
    return [{id:sensor.id,label:sensor.label,status:reading.status,active:reading.status === 'ok' && typeof reading.active === 'boolean' ? reading.active : null,sampledAt:sampledAtFromRequest(requestStartedAt,0)}]
  })
}
