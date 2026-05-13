const rules = [
  {
    name: 'Auto Generator Start',
    trigger: 'Battery < 12.1V',
    action: 'Start Generator',
    enabled: true
  },
  {
    name: 'Battery Temperature Protection',
    trigger: 'Battery Temp > 120°F',
    action: 'Disable Charging',
    enabled: true
  },
  {
    name: 'Freeze Protection',
    trigger: 'Outdoor Temp < 34°F',
    action: 'Enable Furnace',
    enabled: false
  }
]

export default function AutomationPanel() {
  return (
    <div className="card automation-card">
      <div className="panel-title">Automation Rules</div>

      <div className="automation-list">
        {rules.map(rule => (
          <div key={rule.name} className="automation-item">
            <div>
              <div className="automation-name">{rule.name}</div>
              <div className="automation-trigger">
                IF {rule.trigger} → {rule.action}
              </div>
            </div>

            <label className="switch">
              <input type="checkbox" defaultChecked={rule.enabled} />
              <span className="slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
