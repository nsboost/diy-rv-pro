export default function SystemStatusBar() {
  return (
    <div className="status-bar card">
      <div className="status-item good">
        <span className="dot"></span>
        Controller Online
      </div>

      <div className="status-item good">
        <span className="dot"></span>
        Shore Power Stable
      </div>

      <div className="status-item warning">
        <span className="dot"></span>
        Generator Standby
      </div>

      <div className="status-item good">
        <span className="dot"></span>
        Solar Charging Active
      </div>
    </div>
  )
}
