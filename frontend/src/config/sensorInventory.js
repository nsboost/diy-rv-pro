export const boardPins = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21]

// ROM identity includes family, serial number and Dallas CRC; never use discovery order.
export function validTemperatureAddress(address) {
  if (!/^28[0-9a-f]{14}$/i.test(address || '')) return false
  const bytes = address.match(/../g).map(byte => parseInt(byte, 16))
  let crc = 0
  for (const byte of bytes.slice(0, 7)) {
    let value = byte
    for (let bit = 0; bit < 8; bit++) {
      const mix = (crc ^ value) & 1
      crc >>= 1
      if (mix) crc ^= 0x8c
      value >>= 1
    }
  }
  return crc === bytes[7]
}

export function sensorOptions(profile) {
  return (profile.temperatureZones || []).filter(sensor => sensor.enabled)
    .map(sensor => ({ id: sensor.id, label: sensor.label, address: sensor.address || '' }))
}

export function validateSensorInventory(profile) {
  const errors = []
  const buses = profile.temperatureBuses || []
  const sensors = profile.temperatureZones || []
  const enabledBuses = buses.filter(bus => bus.enabled)
  const pins = new Set()
  for (const bus of enabledBuses) {
    if (!boardPins.includes(bus.gpio)) errors.push(`${bus.label}: select an available bus GPIO`)
    if (pins.has(bus.gpio)) errors.push(`${bus.label}: GPIO is already assigned to another bus`)
    pins.add(bus.gpio)
  }
  const addresses = new Set()
  for (const sensor of sensors.filter(item => item.enabled)) {
    if (sensor.sensorType === 'ds18b20') {
      if (!enabledBuses.some(bus => bus.id === sensor.busId)) errors.push(`${sensor.label}: select an enabled temperature bus`)
      if (!validTemperatureAddress(sensor.address)) errors.push(`${sensor.label}: enter a valid DS18B20 ROM address including CRC`)
      const address = sensor.address?.toLowerCase()
      if (addresses.has(address)) errors.push(`${sensor.label}: this address is already registered`)
      addresses.add(address)
    } else if (['ntc-10k', 'thermistor'].includes(sensor.sensorType) && !boardPins.includes(sensor.tempSensorGpio)) {
      errors.push(`${sensor.label}: select a sensor GPIO`)
    }
    if (!(Number.isFinite(sensor.lowAlarmF) && Number.isFinite(sensor.highAlarmF) && sensor.lowAlarmF < sensor.highAlarmF)) {
      errors.push(`${sensor.label}: low alarm must be below high alarm`)
    }
  }
  for (const section of ['hvacZones', 'waterHeaters', 'weatherStations']) {
    for (const item of (profile[section] || []).filter(item => item.enabled)) {
      if (item.temperatureSensorId && !sensors.some(sensor => sensor.enabled && sensor.id === item.temperatureSensorId)) {
        errors.push(`${item.label}: assigned temperature sensor is missing or disabled`)
      }
      if (section === 'hvacZones' && item.controlMode === 'controller' && !item.temperatureSensorId) {
        errors.push(`${item.label}: select a temperature sensor before enabling HVAC control`)
      }
    }
  }
  for (const section of Object.keys(profile).filter(key => Array.isArray(profile[key]) && key !== 'temperatureBuses')) {
    for (const item of profile[section].filter(item => item.enabled)) {
      for (const key of ['gpio', 'senseGpio', 'tempSensorGpio', 'runSenseGpio', 'rpmInputGpio', 'tamperGpio']) {
        if (item[key] >= 0 && pins.has(item[key])) errors.push(`${item.label}: ${key} conflicts with a temperature bus`)
      }
    }
  }
  return errors
}

export function temperatureSources(profile) {
  return sensorOptions(profile).map(sensor => [`temperature.${sensor.id}.tempF`, `${sensor.label} temperature`])
}

export function resolveTemperature(sensor, readings, now = Date.now()) {
  const reading = readings?.find(item => item.id === sensor.id &&
    (sensor.sensorType !== 'ds18b20' || item.address?.toLowerCase() === sensor.address?.toLowerCase()))
  if (!reading || reading.status !== 'ok' || !Number.isFinite(reading.tempF) ||
      !Number.isFinite(reading.sampledAt) || now - reading.sampledAt > 30000 || reading.sampledAt > now + 1000) {
    return { tempF: null, status: reading?.status === 'ok' ? 'stale' : reading?.status || 'unavailable' }
  }
  return { tempF: reading.tempF, status: 'ok' }
}
