import {sampledAtFromRequest} from './sensorFreshness.js'
export function mapDiscoveredTemperatures(devices, sensors, requestStartedAt) {
  if (!Array.isArray(devices)) return []
  return sensors.filter(sensor=>sensor.enabled && sensor.sensorType === 'ds18b20').flatMap(sensor=>{
    const matches = devices.filter(device=>device && device.busId === sensor.busId && typeof device.address === 'string' && device.address.toLowerCase() === sensor.address?.toLowerCase())
    if (matches.length !== 1) return []
    const device = matches[0]
    return [{...device,id:sensor.id,sampledAt:sampledAtFromRequest(requestStartedAt,device.ageMs)}]
  })
}
