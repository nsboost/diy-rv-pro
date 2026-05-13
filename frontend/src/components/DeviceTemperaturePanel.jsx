const devices = [
  { name: 'Battery Bank', temp: 82 },
  { name: 'Inverter', temp: 104 },
  { name: 'Generator', temp: 162 },
  { name: 'Refrigerator', temp: 38 },
  { name: 'Front AC Compressor', temp: 118 },
  { name: 'Rear AC Compressor', temp: 112 }
]

export default function DeviceTemperaturePanel() {
  return (
    <div className="card device-temp-card">
      <div className="panel-title">Equipment Temperatures</div>

      <div className="device-list">
        {devices.map(device => (
          <div key={device.name} className="device-row">
            <div className="device-name">{device.name}</div>

            <div className="device-temp">
              {device.temp}°F
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
