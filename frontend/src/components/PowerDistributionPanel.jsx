const circuits = [
  { name: 'Front AC', amps: 14.2, status: 'active' },
  { name: 'Rear AC', amps: 11.4, status: 'active' },
  { name: 'Converter', amps: 6.8, status: 'active' },
  { name: 'Microwave', amps: 0.0, status: 'idle' },
  { name: 'Water Heater', amps: 9.7, status: 'active' }
]

export default function PowerDistributionPanel() {
  return (
    <div className="card power-card">
      <div className="panel-title">Power Distribution</div>

      <div className="circuit-list">
        {circuits.map(circuit => (
          <div key={circuit.name} className="circuit-row">
            <div>
              <div className="circuit-name">{circuit.name}</div>
              <div className="circuit-status">{circuit.status.toUpperCase()}</div>
            </div>

            <div className="circuit-amps">{circuit.amps}A</div>
          </div>
        ))}
      </div>
    </div>
  )
}
