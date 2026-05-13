export default function TankCard({ title, level, color }) {
  return (
    <div className="card tank-card">
      <div className="tank-header">
        <span>{title}</span>
        <span>{level}%</span>
      </div>

      <div className="tank-bar">
        <div
          className="tank-fill"
          style={{ height: `${level}%`, background: color }}
        />
      </div>
    </div>
  )
}
