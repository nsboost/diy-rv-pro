export default function ClimateZoneCard({ zone }) {
  return (
    <div className="card climate-card">
      <div className="climate-top">
        <div>
          <div className="zone-name">{zone.name}</div>
          <div className="zone-mode">{zone.mode.toUpperCase()}</div>
        </div>

        <div className="zone-temp">{zone.temp}°</div>
      </div>

      <div className="climate-details">
        <div>Humidity: {zone.humidity}%</div>
        <div>Setpoint: {zone.setpoint}°</div>
      </div>

      <div className="equipment-row">
        {zone.equipment.ac && <span>AC</span>}
        {zone.equipment.furnace && <span>Furnace</span>}
        {zone.equipment.heatPump && <span>Heat Pump</span>}
      </div>
    </div>
  )
}
