import { useEffect, useMemo, useState } from 'react'
import { boardPins, sensorOptions } from '../config/sensorInventory.js'
import { validateProfile, sectionLimits } from '../config/validateProfile.js'

import {
  configuratorSections,
  createProfileItem,
  normalizeSystemProfile,
  optionSets,
  summarizeProfile
} from '../config/systemProfile.js'

function Field({ label, children }) {
  return (
    <label className="config-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, type = 'text', min, max }) {
  return (
    <input
      type={type}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={event => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
    />
  )
}

function SelectInput({ value, options, onChange }) {
  return (
    <select value={value ?? options[0]} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}

function NumberInput({ label, value, onChange, min = -1, max = 3300 }) {
  return (
    <Field label={label}>
      <TextInput type="number" min={min} max={max} value={value ?? -1} onChange={onChange} />
    </Field>
  )
}

function ItemCommonFields({ item, updateItem }) {
  return (
    <>
      <Field label="Enabled">
        <input type="checkbox" checked={Boolean(item.enabled)} onChange={event => updateItem('enabled', event.target.checked)} />
      </Field>
      <Field label="Label">
        <TextInput value={item.label} onChange={value => updateItem('label', value)} />
      </Field>
    </>
  )
}

function ItemFields({ sectionId, item, updateItem, profile }) {
  const temperatureSelect = <Field label="Temperature sensor"><select value={item.temperatureSensorId || ''} onChange={event => updateItem('temperatureSensorId', event.target.value)}><option value="">Select a named sensor</option>{sensorOptions(profile).map(sensor => <option key={sensor.id} value={sensor.id}>{sensor.label}{sensor.address ? ` · ${sensor.address}` : ''}</option>)}</select></Field>
  if (sectionId === 'temperatureBuses') return <><ItemCommonFields item={item} updateItem={updateItem} /><Field label="Bus GPIO"><select value={item.gpio} onChange={event => updateItem('gpio', Number(event.target.value))}><option value={-1}>Unassigned</option>{boardPins.map(pin => <option key={pin} value={pin}>GPIO {pin}</option>)}</select></Field><p className="section-hint">One data GPIO per shared bus. Register each probe by its unique ROM address under Temperature Sensors. Use protected, powered wiring.</p></>

  if (sectionId === 'hvacZones') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Control">
          <SelectInput value={item.controlMode} options={['monitor-only', 'self-controlled', 'controller']} onChange={value => updateItem('controlMode', value)} />
        </Field>
        <Field label="Primary Equipment">
          <SelectInput value={item.equipment?.[0] || 'air-conditioner'} options={optionSets.hvacEquipment} onChange={value => updateItem('equipment', [value])} />
        </Field>
        <NumberInput label="Cool Relay" value={item.coolRelay} onChange={value => updateItem('coolRelay', value)} max={63} />
        <NumberInput label="Furnace Relay" value={item.furnaceRelay} onChange={value => updateItem('furnaceRelay', value)} max={63} />
        <NumberInput label="Heat Pump Relay" value={item.heatPumpRelay} onChange={value => updateItem('heatPumpRelay', value)} max={63} />
        <NumberInput label="Fan Relay" value={item.fanRelay} onChange={value => updateItem('fanRelay', value)} max={63} />
        {temperatureSelect}
      </>
    )
  }

  if (sectionId === 'temperatureZones') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Zone Type">
          <SelectInput value={item.type} options={optionSets.tempZoneKind} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Sensor">
          <SelectInput value={item.sensorType} options={optionSets.tempSensorTypes} onChange={value => updateItem('sensorType', value)} />
        </Field>
        {item.sensorType === 'ds18b20' ? <><Field label="Temperature bus"><select value={item.busId || ''} onChange={event => updateItem('busId', event.target.value)}><option value="">Select a bus</option>{profile.temperatureBuses.filter(bus => bus.enabled).map(bus => <option key={bus.id} value={bus.id}>{bus.label} · GPIO {bus.gpio}</option>)}</select></Field><Field label="Sensor ROM address"><TextInput value={item.address} onChange={value => updateItem('address', value.trim().toLowerCase())} /></Field><p className="section-hint">16 hexadecimal characters including the CRC. Assign a friendly label after identifying the probe. Discovery will list controller-detected probes when connected.</p></> : <NumberInput label="Temp GPIO" value={item.tempSensorGpio} onChange={value => updateItem('tempSensorGpio', value)} max={48} />}

        <NumberInput label="Low Alarm F" value={item.lowAlarmF} onChange={value => updateItem('lowAlarmF', value)} min={-40} max={250} />
        <NumberInput label="High Alarm F" value={item.highAlarmF} onChange={value => updateItem('highAlarmF', value)} min={-40} max={250} />
      </>
    )
  }

  if (['solarChargeControllers', 'inverters', 'batteries'].includes(sectionId)) {
    const typeOptions = sectionId === 'inverters' ? optionSets.inverterType : ['monitor-only', 'shunt', 'mppt', 'pwm', 'lithium', 'agm', 'lead-acid']
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Type">
          <SelectInput value={item.type} options={typeOptions} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Communication">
          <SelectInput value={item.communication} options={optionSets.communication} onChange={value => updateItem('communication', value)} />
        </Field>
        <Field label="Sensor">
          <SelectInput value={item.sensorType} options={optionSets.sensorTypes} onChange={value => updateItem('sensorType', value)} />
        </Field>
        <NumberInput label={sectionId === 'batteries' ? 'Capacity Ah' : 'Max Current A'} value={sectionId === 'batteries' ? item.capacityAh : item.maxCurrentA} onChange={value => updateItem(sectionId === 'batteries' ? 'capacityAh' : 'maxCurrentA', value)} min={0} max={sectionId === 'batteries' ? 2000 : 500} />
        <NumberInput label="ADC" value={item.adcChannel} onChange={value => updateItem('adcChannel', value)} max={48} />
        <NumberInput label="Sense GPIO" value={item.senseGpio} onChange={value => updateItem('senseGpio', value)} max={48} />
      </>
    )
  }

  if (sectionId === 'generators') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Fuel">
          <SelectInput value={item.fuelType} options={optionSets.generatorFuel} onChange={value => updateItem('fuelType', value)} />
        </Field>
        <Field label="Control">
          <SelectInput value={item.controlStrategy} options={optionSets.generatorControl} onChange={value => updateItem('controlStrategy', value)} />
        </Field>
        <Field label="Confirmation">
          <SelectInput value={item.confirmationStrategy} options={optionSets.confirmation} onChange={value => updateItem('confirmationStrategy', value)} />
        </Field>
        <NumberInput label="Start Relay" value={item.startRelay} onChange={value => updateItem('startRelay', value)} max={63} />
        <NumberInput label="Stop Relay" value={item.stopRelay} onChange={value => updateItem('stopRelay', value)} max={63} />
        <NumberInput label="Run GPIO" value={item.runSenseGpio} onChange={value => updateItem('runSenseGpio', value)} max={48} />
        <NumberInput label="Max Crank Seconds" value={item.maxCrankSeconds} onChange={value => updateItem('maxCrankSeconds', value)} min={1} max={30} />
        <NumberInput label="Warmup Seconds" value={item.warmupSeconds} onChange={value => updateItem('warmupSeconds', value)} min={0} max={600} />
        <NumberInput label="Cooldown Seconds" value={item.cooldownSeconds} onChange={value => updateItem('cooldownSeconds', value)} min={0} max={600} />
        <NumberInput label="RPM GPIO" value={item.rpmInputGpio} onChange={value => updateItem('rpmInputGpio', value)} max={48} />
      </>
    )
  }

  if (['acBreakers', 'dcCircuits'].includes(sectionId)) {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Breaker Type">
          <SelectInput value={item.type} options={optionSets.breakerKind} onChange={value => updateItem('type', value)} />
        </Field>
        <NumberInput label="Rating A" value={item.ratingA} onChange={value => updateItem('ratingA', value)} min={0} max={100} />
        <Field label="Monitored">
          <input type="checkbox" checked={Boolean(item.monitored)} onChange={event => updateItem('monitored', event.target.checked)} />
        </Field>
        <Field label="Controllable">
          <input type="checkbox" checked={Boolean(item.controllable)} onChange={event => updateItem('controllable', event.target.checked)} />
        </Field>
        <NumberInput label="Relay" value={item.relay} onChange={value => updateItem('relay', value)} max={63} />
        <NumberInput label="Sense GPIO" value={item.senseGpio} onChange={value => updateItem('senseGpio', value)} max={48} />
      </>
    )
  }

  if (sectionId === 'waterTanks') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Tank Type">
          <SelectInput value={item.type} options={optionSets.tankType} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Sensor">
          <SelectInput value={item.sensorType} options={optionSets.sensorTypes} onChange={value => updateItem('sensorType', value)} />
        </Field>
        <NumberInput label="Capacity Gal" value={item.capacityGal} onChange={value => updateItem('capacityGal', value)} min={0} max={500} />
        <NumberInput label="ADC" value={item.adcChannel} onChange={value => updateItem('adcChannel', value)} max={48} />
        <NumberInput label="Empty mV" value={item.emptyMv} onChange={value => updateItem('emptyMv', value)} min={0} max={3300} />
        <NumberInput label="Full mV" value={item.fullMv} onChange={value => updateItem('fullMv', value)} min={0} max={3300} />
      </>
    )
  }

  if (sectionId === 'waterHeaters') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Heater Type">
          <SelectInput value={item.type} options={optionSets.waterHeaterType} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Control">
          <SelectInput value={item.controlMode} options={optionSets.waterControlMode} onChange={value => updateItem('controlMode', value)} />
        </Field>
        <Field label="AC Element"><input type="checkbox" checked={Boolean(item.hasAcElement)} onChange={event => updateItem('hasAcElement', event.target.checked)} /></Field>
        <Field label="DC Element"><input type="checkbox" checked={Boolean(item.hasDcElement)} onChange={event => updateItem('hasDcElement', event.target.checked)} /></Field>
        <Field label="Propane"><input type="checkbox" checked={Boolean(item.hasPropane)} onChange={event => updateItem('hasPropane', event.target.checked)} /></Field>
        <Field label="Recirc Pump"><input type="checkbox" checked={Boolean(item.recircPump)} onChange={event => updateItem('recircPump', event.target.checked)} /></Field>
        {temperatureSelect}
        <NumberInput label="AC Relay" value={item.acElementRelay} onChange={value => updateItem('acElementRelay', value)} max={63} />
        <NumberInput label="DC Relay" value={item.dcElementRelay} onChange={value => updateItem('dcElementRelay', value)} max={63} />
        <NumberInput label="Propane Relay" value={item.propaneRelay} onChange={value => updateItem('propaneRelay', value)} max={63} />
        <NumberInput label="Recirc Relay" value={item.recircPumpRelay} onChange={value => updateItem('recircPumpRelay', value)} max={63} />
      </>
    )
  }

  if (sectionId === 'waterPumps') return <>
    <ItemCommonFields item={item} updateItem={updateItem} />
    <Field label="Pump type"><SelectInput value={item.type} options={['fresh-water','recirculation','transfer','waste','custom']} onChange={value => updateItem('type',value)} /></Field>
    <Field label="Control"><SelectInput value={item.controlMode} options={optionSets.waterControlMode} onChange={value => updateItem('controlMode',value)} /></Field>
    <NumberInput label="Pump Relay" value={item.relay} onChange={value => updateItem('relay',value)} max={63} />
    <NumberInput label="Feedback GPIO" value={item.senseGpio} onChange={value => updateItem('senseGpio',value)} max={48} />
  </>
  if (sectionId === 'propaneSystems') return <>
    <ItemCommonFields item={item} updateItem={updateItem} />
    <Field label="Fuel system"><SelectInput value={item.type} options={['lp-tank','fuel-tank','pressure-monitor','custom']} onChange={value => updateItem('type',value)} /></Field>
    <Field label="Sensor"><SelectInput value={item.sensorType} options={optionSets.sensorTypes} onChange={value => updateItem('sensorType',value)} /></Field>
    <NumberInput label="ADC GPIO" value={item.adcChannel} onChange={value => updateItem('adcChannel',value)} max={48} />
    <NumberInput label="Feedback GPIO" value={item.senseGpio} onChange={value => updateItem('senseGpio',value)} max={48} />
  </>
  if (sectionId === 'weatherStations') return <>
    <ItemCommonFields item={item} updateItem={updateItem} />
    <Field label="Station type"><SelectInput value={item.type} options={['outdoor','indoor','roof','custom']} onChange={value => updateItem('type',value)} /></Field>
    <Field label="Communication"><SelectInput value={item.communication} options={optionSets.communication} onChange={value => updateItem('communication',value)} /></Field>
    <Field label="Sensor"><SelectInput value={item.sensorType} options={optionSets.sensorTypes} onChange={value => updateItem('sensorType',value)} /></Field>
    {temperatureSelect}
    <NumberInput label="Legacy Temperature GPIO" value={item.tempSensorGpio} onChange={value => updateItem('tempSensorGpio',value)} max={48} />
  </>
  if (sectionId === 'customIo') return <>
    <ItemCommonFields item={item} updateItem={updateItem} />
    <Field label="I/O type"><SelectInput value={item.type} options={['digital-input','digital-output','analog-input','relay-output']} onChange={value => updateItem('type',value)} /></Field>
    <Field label="Control"><SelectInput value={item.controlMode} options={['monitor-only','controller']} onChange={value => updateItem('controlMode',value)} /></Field>
    <NumberInput label="GPIO" value={item.gpio} onChange={value => updateItem('gpio',value)} max={48} />
    <NumberInput label="Relay Channel" value={item.relay} onChange={value => updateItem('relay',value)} max={63} />
  </>

  if (sectionId === 'cameras') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Role">
          <SelectInput value={item.role} options={optionSets.cameraRole} onChange={value => updateItem('role', value)} />
        </Field>
        <Field label="Protocol">
          <SelectInput value={item.protocol} options={optionSets.cameraProtocol} onChange={value => updateItem('protocol', value)} />
        </Field>
        <Field label="Stream URL">
          <TextInput value={item.streamUrl} onChange={value => updateItem('streamUrl', value)} />
        </Field>
        <Field label="Snapshot URL">
          <TextInput value={item.snapshotUrl} onChange={value => updateItem('snapshotUrl', value)} />
        </Field>
        <Field label="Gateway">
          <TextInput value={item.gatewayName} onChange={value => updateItem('gatewayName', value)} />
        </Field>
        <Field label="Requires Auth"><input type="checkbox" checked={Boolean(item.requiresAuth)} onChange={event => updateItem('requiresAuth', event.target.checked)} /></Field>
        <Field label="Motion Record"><input type="checkbox" checked={Boolean(item.recordMotion)} onChange={event => updateItem('recordMotion', event.target.checked)} /></Field>
      </>
    )
  }

  if (sectionId === 'securityZones') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Zone Type">
          <TextInput value={item.type} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Arm Home"><input type="checkbox" checked={Boolean(item.armHome)} onChange={event => updateItem('armHome', event.target.checked)} /></Field>
        <Field label="Arm Away"><input type="checkbox" checked={Boolean(item.armAway)} onChange={event => updateItem('armAway', event.target.checked)} /></Field>
        <NumberInput label="Entry Delay Sec" value={item.entryDelaySeconds} onChange={value => updateItem('entryDelaySeconds', value)} min={0} max={600} />
        <NumberInput label="Exit Delay Sec" value={item.exitDelaySeconds} onChange={value => updateItem('exitDelaySeconds', value)} min={0} max={600} />
      </>
    )
  }

  if (sectionId === 'securitySensors') {
    return (
      <>
        <ItemCommonFields item={item} updateItem={updateItem} />
        <Field label="Sensor Type">
          <SelectInput value={item.type} options={optionSets.securitySensorKind} onChange={value => updateItem('type', value)} />
        </Field>
        <Field label="Input Type">
          <SelectInput value={item.inputType} options={optionSets.securityInput} onChange={value => updateItem('inputType', value)} />
        </Field>
        <Field label="Security zone"><select value={item.zoneId || ''} onChange={event => updateItem('zoneId', event.target.value)}><option value="">Unassigned</option>{profile.securityZones.filter(zone => zone.enabled).map(zone => <option key={zone.id} value={zone.id}>{zone.label}</option>)}</select></Field>
        <Field label="Polarity">
          <SelectInput value={item.contactPolarity} options={optionSets.contactPolarity} onChange={value => updateItem('contactPolarity', value)} />
        </Field>
        <NumberInput label="GPIO" value={item.gpio} onChange={value => updateItem('gpio', value)} max={48} />
        <NumberInput label="Expander Addr" value={item.expanderAddress} onChange={value => updateItem('expanderAddress', value)} max={127} />
        <NumberInput label="Expander Pin" value={item.expanderPin} onChange={value => updateItem('expanderPin', value)} max={31} />
        <NumberInput label="Tamper GPIO" value={item.tamperGpio} onChange={value => updateItem('tamperGpio', value)} max={48} />
        <NumberInput label="Heartbeat Sec" value={item.heartbeatSeconds} onChange={value => updateItem('heartbeatSeconds', value)} min={0} max={86400} />
        <Field label="Low Battery"><input type="checkbox" checked={Boolean(item.lowBattery)} onChange={event => updateItem('lowBattery', event.target.checked)} /></Field>
      </>
    )
  }

  return (
    <>
      <ItemCommonFields item={item} updateItem={updateItem} />
      <Field label="Type">
        <TextInput value={item.type} onChange={value => updateItem('type', value)} />
      </Field>
      <Field label="Control">
        <SelectInput value={item.controlMode} options={['monitor-only', 'self-controlled', 'controller']} onChange={value => updateItem('controlMode', value)} />
      </Field>
      <NumberInput label="GPIO" value={item.gpio} onChange={value => updateItem('gpio', value)} max={48} />
      <NumberInput label="Relay" value={item.relay} onChange={value => updateItem('relay', value)} max={63} />
      <NumberInput label="Sense GPIO" value={item.senseGpio} onChange={value => updateItem('senseGpio', value)} max={48} />
    </>
  )
}

function SectionEditor({ section, items, selectedIndex, onSelect, onAdd, onRemove, onUpdate, profile }) {
  const selected = items[selectedIndex] || null

  return (
    <section className="config-editor">
      <div className="config-editor-list">
        <div className="config-editor-heading">
          <h3>{section.label}</h3>
          <button type="button" className="compact-action" onClick={onAdd}>Add</button>
        </div>
        {items.length === 0 && <div className="empty-config">No items configured</div>}
        {items.map((item, index) => (
          <button
            type="button"
            className={index === selectedIndex ? 'config-item active' : 'config-item'}
            key={item.id || `${section.id}-${index}`}
            onClick={() => onSelect(index)}
          >
            <strong>{item.label || item.id}</strong>
            <span>{item.enabled ? 'Enabled' : 'Disabled'} / {item.type || item.controlStrategy || 'configured'}</span>
          </button>
        ))}
      </div>
      <div className="config-detail">
        {selected ? (
          <>
            <div className="config-detail-heading">
              <h3>{selected.label}</h3>
              <button type="button" className="danger-action compact" onClick={() => onRemove(selectedIndex)}>Remove</button>
            </div>
            <div className="config-form-grid">
              <ItemFields
                profile={profile}
                sectionId={section.id}
                item={selected}
                updateItem={(key, value) => onUpdate(selectedIndex, key, value)}
              />
            </div>
          </>
        ) : (
          <div className="empty-config detail">Select or add an item to configure this subsystem.</div>
        )}
      </div>
    </section>
  )
}

export default function SetupWizard({ initialProfile, onSave, onDiscover }) {
  const [profile, setProfile] = useState(() => normalizeSystemProfile(initialProfile))
  const [activeSection, setActiveSection] = useState('rvProfile')
  const [selectedIndexes, setSelectedIndexes] = useState({})
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [discovered, setDiscovered] = useState([])
  const [discovering, setDiscovering] = useState(false)
  const errors = useMemo(() => validateProfile(profile), [profile])
  const summary = useMemo(() => summarizeProfile(profile), [profile])
  const section = configuratorSections.find(item => item.id === activeSection) || configuratorSections[0]

  useEffect(() => {
    setProfile(normalizeSystemProfile(initialProfile))
  }, [initialProfile])

  const updateProfile = updater => setProfile(current => normalizeSystemProfile(updater(structuredClone(current))))

  const addItem = sectionId => updateProfile(current => {
    if (current[sectionId].length >= sectionLimits[sectionId]) return current
    current[sectionId].push(createProfileItem(sectionId, current[sectionId].length))
    setSelectedIndexes(indexes => ({ ...indexes, [sectionId]: current[sectionId].length - 1 }))
    return current
  })

  const removeItem = (sectionId, index) => updateProfile(current => {
    current[sectionId].splice(index, 1)
    setSelectedIndexes(indexes => ({ ...indexes, [sectionId]: Math.max(0, index - 1) }))
    return current
  })

  const updateItem = (sectionId, index, key, value) => updateProfile(current => {
    current[sectionId][index] = { ...current[sectionId][index], [key]: value }
    return current
  })

  const save = async event => {
    event.preventDefault()
    if (saving) return
    if (errors.length) { setStatus('Resolve the configuration issues before saving.'); return }
    setSaving(true)
    setStatus('Saving configuration...')
    try {
      const message = await onSave(profile)
      setStatus(message || 'Configuration saved')
    } catch (error) {
      setStatus(error.message || 'Configuration save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="configurator" onSubmit={save}>
      <div className="configurator-header">
        <div>
          <h2>Universal RV Configuration</h2>
          <p>Configure only the equipment installed on this RV. Disabled or unassigned outputs stay inactive in firmware.</p>
        </div>
        <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button>
      </div>

      <div className="config-toolbar">
        <button type="button" className="secondary-action" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], {type: 'application/json'}))
          const link = document.createElement('a'); link.href = url; link.download = 'diy-rv-configuration.json'; link.click(); URL.revokeObjectURL(url)
        }}>Export Configuration</button>
        <label className="secondary-action">Import Configuration<input type="file" accept="application/json,.json" onChange={async event => {
          const file = event.target.files?.[0]
          if (!file) return
          try {
            if (file.size > 24576) throw new Error('Configuration file exceeds the controller limit')
            const raw = JSON.parse(await file.text())
            if (raw.schemaVersion !== 1) throw new Error('Unsupported configuration version')
            const imported = normalizeSystemProfile(raw)
            const issues = validateProfile(imported)
            if (issues.length) throw new Error(issues.join('; '))
            setProfile(imported); setSelectedIndexes({}); setStatus('Imported for review. Save to apply.')
          } catch (error) { setStatus(error.message) }
          event.target.value = ''
        }} /></label>
      </div>
      {errors.length > 0 && <section className="configuration-issues" aria-label="Configuration issues"><h3>Configuration needs attention</h3><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></section>}
      <div className="configurator-body">
        <aside className="configurator-nav">
          {configuratorSections.map(item => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'active' : ''}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.label}</span>
              {Array.isArray(profile[item.id]) && <strong>{profile[item.id].length}</strong>}
            </button>
          ))}
        </aside>

        <div className="configurator-main">
          {activeSection === 'temperatureZones' && <section className="config-detail">
            <h3>Discover temperature probes</h3><p>Save bus GPIO assignments first, then restart the controller to apply them. Identify each probe by its reading and address before naming it.</p>
            <button type="button" className="secondary-action" disabled={discovering} onClick={async () => { setDiscovering(true); try { setDiscovered(await onDiscover()); setStatus('Discovery complete. Register each probe with a friendly name.') } catch (error) { setStatus(error.message) } finally { setDiscovering(false) } }}>{discovering ? 'Discovering...' : 'Discover Sensors'}</button>
            {discovered.map(device => <div className="notification-item" key={`${device.busId}-${device.address}`}><span>{device.demo ? 'Demo probe · ' : ''}{device.address} · {device.tempF ?? 'Unavailable'} F · {device.status}</span><button type="button" className="compact-action" disabled={profile.temperatureZones.some(sensor => sensor.address?.toLowerCase() === device.address?.toLowerCase())} onClick={() => updateProfile(current => {
              if (current.temperatureZones.length >= sectionLimits.temperatureZones) return current
              current.temperatureZones.push({...createProfileItem('temperatureZones', current.temperatureZones.length), busId: device.busId, address: device.address})
              setSelectedIndexes(indexes => ({...indexes, temperatureZones: current.temperatureZones.length - 1}))
              return current
            })}>Register Probe</button></div>)}
          </section>}
          {activeSection === 'rvProfile' ? (
            <section className="config-detail rv-profile-editor">
              <div className="config-detail-heading">
                <h3>RV Profile</h3>
              </div>
              <div className="config-form-grid">
                <Field label="Name">
                  <TextInput value={profile.rvProfile.name} onChange={value => updateProfile(current => ({ ...current, rvProfile: { ...current.rvProfile, name: value } }))} />
                </Field>
                <Field label="RV Type">
                  <TextInput value={profile.rvProfile.rvType} onChange={value => updateProfile(current => ({ ...current, rvProfile: { ...current.rvProfile, rvType: value } }))} />
                </Field>
                <Field label="Length Ft">
                  <TextInput type="number" min="0" max="60" value={profile.rvProfile.lengthFt} onChange={value => updateProfile(current => ({ ...current, rvProfile: { ...current.rvProfile, lengthFt: value } }))} />
                </Field>
                <Field label="Electrical Service">
                  <SelectInput value={profile.rvProfile.electricalService} options={optionSets.electricalService} onChange={value => updateProfile(current => ({ ...current, rvProfile: { ...current.rvProfile, electricalService: value } }))} />
                </Field>
                <Field label="Shore Power">
                  <SelectInput value={profile.rvProfile.shorePower} options={optionSets.shorePower} onChange={value => updateProfile(current => ({ ...current, rvProfile: { ...current.rvProfile, shorePower: value } }))} />
                </Field>
              </div>
            </section>
          ) : (
            <SectionEditor
              profile={profile}
              section={section}
              items={profile[activeSection]}
              selectedIndex={selectedIndexes[activeSection] || 0}
              onSelect={index => setSelectedIndexes(current => ({ ...current, [activeSection]: index }))}
              onAdd={() => addItem(activeSection)}
              onRemove={index => removeItem(activeSection, index)}
              onUpdate={(index, key, value) => updateItem(activeSection, index, key, value)}
            />
          )}
        </div>
      </div>

      <div className="configurator-summary">
        {summary.map(([label, enabled, total]) => (
          <span key={label}>{label}: <strong>{enabled}/{total}</strong></span>
        ))}
      </div>
      {status && <div className="configurator-status" role="status">{status}</div>}
    </form>
  )
}
