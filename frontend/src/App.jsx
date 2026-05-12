import { LineChart, Line, ResponsiveContainer } from 'recharts'

const data = [
  { t: '00', v: 13.2 },
  { t: '02', v: 13.1 },
  { t: '04', v: 12.9 },
  { t: '06', v: 13.4 },
  { t: '08', v: 13.8 },
  { t: '10', v: 14.1 },
  { t: '12', v: 14.4 },
]

function MetricCard({ title, value, unit }) {
  return (
    <div className="card metric-card">
      <div className="metric-title">{title}</div>
      <div className="metric-value">
        {value}<span>{unit}</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">DIY RV PRO</div>
        <nav>
          <button>Dashboard</button>
          <button>Power</button>
          <button>Climate</button>
          <button>Tanks</button>
          <button>Automation</button>
          <button>Settings</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>System Overview</h1>
            <p>Connected • Nominal</p>
          </div>
          <div className="status-light online"></div>
        </header>

        <section className="metrics-grid">
          <MetricCard title="Battery Voltage" value="13.4" unit="V" />
          <MetricCard title="Solar Input" value="1280" unit="W" />
          <MetricCard title="Interior Temp" value="72" unit="°F" />
          <MetricCard title="Generator Temp" value="162" unit="°F" />
        </section>

        <section className="graph-panel card">
          <div className="panel-title">Battery Voltage History</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data}>
                <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  )
}
