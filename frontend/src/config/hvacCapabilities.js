export function availableHvacModes(zone) {
  const equipment = zone.availableEquipment || []
  const cool = equipment.includes('ac') || equipment.includes('heatPump')
  const heat = equipment.includes('furnace') || equipment.includes('heatPump')
  return ['Off', ...(cool ? ['Cool'] : []), ...(heat ? ['Heat'] : []), ...(cool || heat ? ['Auto'] : []), ...(equipment.includes('fan') ? ['Fan'] : [])]
}
