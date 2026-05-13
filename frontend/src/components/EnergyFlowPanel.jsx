export default function EnergyFlowPanel() {
  return (
    <div className="card energy-flow-card">
      <div className="panel-title">Energy Flow</div>

      <div className="energy-grid">
        <div className="energy-node solar">
          <div className="energy-label">Solar</div>
          <div className="energy-value">1280W</div>
        </div>

        <div className="energy-arrow">→</div>

        <div className="energy-node battery">
          <div className="energy-label">Battery Bank</div>
          <div className="energy-value">13.4V</div>
        </div>

        <div className="energy-arrow">→</div>

        <div className="energy-node inverter">
          <div className="energy-label">Inverter</div>
          <div className="energy-value">3.2kW</div>
        </div>

        <div className="energy-arrow">→</div>

        <div className="energy-node loads">
          <div className="energy-label">Loads</div>
          <div className="energy-value">2.1kW</div>
        </div>
      </div>
    </div>
  )
}
