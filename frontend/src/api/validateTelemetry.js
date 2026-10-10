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
  const fields = (record, strings = [], numbers = []) => {
    for (const key of strings) if (record[key] !== undefined && typeof record[key] !== 'string') reject()
    for (const key of numbers) if (record[key] !== undefined && record[key] !== null && !Number.isFinite(record[key])) reject()
  }
  fields(value.controller,['name','firmware','uptime','localIp'],['alerts'])
  fields(value.wifi,['mode','ssid','strength'],['rssi'])
  fields(value.time,['display','date'],['localMinute'])
  fields(value.battery,['status'],['voltage','current','stateOfCharge','temperatureF'])
  fields(value.solar,[],['watts','voltage','current','todayKwh'])
  fields(value.loads,[],['watts','voltage','current','totalKwh'])
  fields(value.shorePower,['quality'],['voltage','current'])
  fields(value.inverter,['mode'],['voltage','frequencyHz','efficiency'])
  fields(value.weather,['summary'],['temperatureF','highF','lowF','humidity','windMph'])
  fields(value.generator,['fuelType','startMethod','nextStart'],['runHours'])
  for (const item of value.hvacZones) fields(item,['id','name','mode','sensorLabel'],['tempF','setpointF','coolSetpointF','heatSetpointF','autoDifferentialF','sensorOffsetF'])
  for (const item of value.events) fields(item,['time','type','message'])
  for (const item of value.tanks) fields(item,['name','label','unit'],['level','capacity','gallons'])
  for (const item of value.automationRules) fields(item,['id','name','detail'])
  for (const item of value.notifications || []) fields(item,['id','message','severity','ruleId'],['createdAt','uptimeMs'])
  return value
}
