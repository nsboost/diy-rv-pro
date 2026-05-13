export const powerHistory = [
  { time: '00:00', battery: 13.2, solar: 0 },
  { time: '03:00', battery: 13.0, solar: 0 },
  { time: '06:00', battery: 12.8, solar: 120 },
  { time: '09:00', battery: 13.6, solar: 860 },
  { time: '12:00', battery: 14.2, solar: 1680 },
  { time: '15:00', battery: 14.1, solar: 1420 },
  { time: '18:00', battery: 13.5, solar: 320 },
  { time: '21:00', battery: 13.1, solar: 0 }
]

export const tankLevels = {
  fresh: 78,
  gray: 42,
  black: 31,
  propane: 64
}

export const climateZones = [
  {
    id: 1,
    name: 'Front Living',
    temp: 72,
    humidity: 41,
    setpoint: 70,
    mode: 'cool',
    equipment: {
      ac: true,
      furnace: true,
      heatPump: false
    }
  },
  {
    id: 2,
    name: 'Rear Bedroom',
    temp: 69,
    humidity: 39,
    setpoint: 68,
    mode: 'heat',
    equipment: {
      ac: true,
      furnace: true,
      heatPump: true
    }
  }
]
