const alerts = [
  {
    severity: 'warning',
    title: 'Generator Maintenance Soon',
    description: 'Oil service due in 12 runtime hours.'
  },
  {
    severity: 'critical',
    title: 'Battery Temperature High',
    description: 'Battery bank temperature exceeded threshold.'
  },
  {
    severity: 'info',
    title: 'Shore Power Connected',
    description: '50A shore service active and stable.'
  }
]

export default function AlertsPanel() {
  return (
    <div className="card alerts-card">
      <div className="panel-title">System Alerts</div>

      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={alert.title} className={`alert-item ${alert.severity}`}>
            <div>
              <div className="alert-title">{alert.title}</div>
              <div className="alert-description">{alert.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
