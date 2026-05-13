const sections = [
  {
    title: 'RV Profile',
    items: ['RV Length', 'Electrical Service', 'Shore Power Type']
  },
  {
    title: 'HVAC Configuration',
    items: ['Zone Count', 'Air Conditioners', 'Furnaces', 'Heat Pumps']
  },
  {
    title: 'Generator Setup',
    items: ['Fuel Type', 'Start Method', 'Feedback Signal']
  },
  {
    title: 'Tank Configuration',
    items: ['Fresh Capacity', 'Gray Capacity', 'Black Capacity']
  }
]

export default function SetupWizard() {
  return (
    <div className="card wizard-card">
      <div className="panel-title">Initial System Setup</div>

      <div className="wizard-grid">
        {sections.map(section => (
          <div key={section.title} className="wizard-section">
            <h3>{section.title}</h3>

            {section.items.map(item => (
              <label key={item} className="wizard-field">
                <span>{item}</span>
                <input placeholder={`Configure ${item}`} />
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
