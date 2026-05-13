import {
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

import ClimateZoneCard from './components/ClimateZoneCard'
import TankCard from './components/TankCard'

import {
  powerHistory,
  tankLevels,
  climateZones
} from './data/mockTelemetry'

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
            <p>Controller Connected • All Systems Nominal</p>
          </div>

          <div className="status-wrap">
            <span>ONLINE</span>
            <div className="status-light online"></div>
          </div>
        </header>

        <section className="metrics-grid">
          <MetricCard title="Battery Voltage" value="13.4" unit="V" />
          <MetricCard title="Solar Production" value="1280" unit="W" />
          <MetricCard title="Generator Temp" value="162" unit="°F" />
          <MetricCard title="Inverter Load" value="42" unit="%" />
        </section>

        <section className="dual-grid">
          <div className="graph-panel card">
            <div className="panel-title">Battery Voltage History</div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={powerHistory}>
                  <Line
                    type="monotone"
                    dataKey="battery"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="graph-panel card">
            <div className="panel-title">Solar Production</div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={powerHistory}>
                  <Area
                    type="monotone"
                    dataKey="solar"
                    stroke="#22c55e"
                    fill="#14532d"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="section-header">
          <h2>Climate Zones</h2>
        </section>

        <section className="climate-grid">
          {climateZones.map(zone => (
            <ClimateZoneCard key={zone.id} zone={zone} />
          ))}
        </section>

        <section className="section-header">
          <h2>Tank Monitoring</h2>
        </section>

        <section className="tank-grid">
          <TankCard title="Fresh Water" level={tankLevels.fresh} color="#3b82f6" />
          <TankCard title="Gray Water" level={tankLevels.gray} color="#9ca3af" />
          <TankCard title="Black Water" level={tankLevels.black} color="#f59e0b" />
          <TankCard title="Propane" level={tankLevels.propane} color="#22c55e" />
        </section>
      </main>
    </div>
  )
}
