const interfaces = [
  {
    name: 'ESP32-C3 Main Controller',
    status: 'Connected'
  },
  {
    name: 'CAN Bus',
    status: 'Healthy'
  },
  {
    name: 'Bluetooth',
    status: 'Enabled'
  },
  {
    name: 'WiFi',
    status: 'Connected'
  },
  {
    name: 'MQTT Remote Link',
    status: 'Online'
  }
]

export default function ConnectivityPanel() {
  return (
    <div className="card connectivity-card">
      <div className="panel-title">Connectivity</div>

      <div className="connectivity-list">
        {interfaces.map(item => (
          <div key={item.name} className="connectivity-row">
            <div>{item.name}</div>

            <div className="connectivity-status">
              {item.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
