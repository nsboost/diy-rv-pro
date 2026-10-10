import { sampledAtFromRequest } from './api/sensorFreshness.js'
import { parseHvacSettingsDraft } from './config/hvacSettingsDraft.js'
import { requestControllerJson } from './api/controllerRequest.js'
import ControllerSettings from './components/ControllerSettings.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import { createLocalController, fetchConfig, getAdminToken, fetchTelemetry, pushControlAction, saveConfig } from './api/telemetryClient'
import { persistSystemProfile, isStandaloneDemo } from './config/saveProfile.js'
import NotificationsPanel from './components/NotificationsPanel.jsx'
import { demoProfile, demoReadings } from './data/demoProfile.js'
import { projectTelemetry } from './api/profileTelemetry.js'
import { controlSystems, sourceCatalog } from './config/automationCatalog.js'
import { loadNotificationSettings, saveNotificationSettings } from './api/notificationSettings.js'
import { ruleStatus } from './api/ruleStatus.js'
import { availableHvacModes } from './config/hvacCapabilities.js'
import SetupWizard from './components/SetupWizard.jsx'
import { defaultSystemProfile, normalizeSystemProfile } from './config/systemProfile.js'

const navItems = [
  ['dashboard', 'Dashboard', 'home'],
  ['climate', 'Climate', 'thermo'],
  ['power', 'Power', 'bolt'],
  ['tanks', 'Tanks', 'drop'],
  ['generator', 'Generator', 'truck'],
  ['automation', 'Automation', 'bot'],
  ['history', 'History', 'chart'],
  ['notifications', 'Notifications', 'bell'],
  ['settings', 'Settings', 'gear'],
  ['setup', 'Setup Wizard', 'wand']
]

const automationOperators = ['=', '!=', '>', '>=', '<', '<=', 'between', 'outside', 'changes']

const automationCommands = {
  turnOn: { id: 'turnOn', label: 'Turn On', type: 'state', value: 'on' },
  turnOff: { id: 'turnOff', label: 'Turn Off', type: 'state', value: 'off' },
  start: { id: 'start', label: 'Start', type: 'command', value: 'running' },
  stop: { id: 'stop', label: 'Stop', type: 'command', value: 'stopped' },
  open: { id: 'open', label: 'Open / Shut Off Circuit', type: 'state', value: 'open' },
  close: { id: 'close', label: 'Close / Restore Circuit', type: 'state', value: 'closed' },
  blockOn: { id: 'blockOn', label: 'Block Turning On', type: 'block', value: 'on blocked' },
  blockOff: { id: 'blockOff', label: 'Block Turning Off', type: 'block', value: 'off blocked' },
  unblock: { id: 'unblock', label: 'Remove Block', type: 'unblock', value: 'allowed' },
  setAuto: { id: 'setAuto', label: 'Set Auto Mode', type: 'state', value: 'auto' },
  sendAlert: { id: 'sendAlert', label: 'Send Alert / Notification', type: 'alert', value: 'notify' }
}

function Icon({ name, className = '' }) {
  const common = {
    className: `icon ${className}`,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }

  const paths = {
    menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
    home: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    thermo: <><path d="M14 14.76V5a4 4 0 0 0-8 0v9.76a6 6 0 1 0 8 0Z" /><path d="M10 8v8" /></>,
    bolt: <path d="m13 2-9 13h7l-1 7 9-13h-7l1-7Z" />,
    drop: <path d="M12 2s7 7.2 7 12.2A7 7 0 0 1 5 14.2C5 9.2 12 2 12 2Z" />,
    truck: <><path d="M4 7h10v10H4z" /><path d="M14 11h3l3 3v3h-6z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
    bot: <><rect x="6" y="8" width="12" height="10" rx="3" /><path d="M12 4v4" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M8 18v2" /><path d="M16 18v2" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M7 16l3-5 4 2 4-7" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.04.04a2 2 0 0 1-2.84 2.84l-.04-.04a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.08 1.64V21a2 2 0 0 1-4 0v-.08A1.8 1.8 0 0 0 8.76 19.3a1.8 1.8 0 0 0-2 .36l-.04.04a2 2 0 0 1-2.84-2.84l.04-.04a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 2.64 13H2.5a2 2 0 0 1 0-4h.14A1.8 1.8 0 0 0 4.3 7.92a1.8 1.8 0 0 0-.36-2l-.04-.04A2 2 0 0 1 6.74 3.04l.04.04a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 9.86 1.8V1.7a2 2 0 0 1 4 0v.1a1.8 1.8 0 0 0 1.08 1.64 1.8 1.8 0 0 0 2-.36l.04-.04a2 2 0 1 1 2.84 2.84l-.04.04a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21.1 9H21.2a2 2 0 0 1 0 4h-.1A1.8 1.8 0 0 0 19.4 15Z" /></>,
    wand: <><path d="m15 4 5 5" /><path d="M13 6 4 15l5 5 9-9" /><path d="M4 4h.01" /><path d="M9 2h.01" /><path d="M2 9h.01" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 7 7 0 1 0 20 15.5Z" />,
    wifi: <><path d="M5 12.55a11 11 0 0 1 14 0" /><path d="M8.5 16a6 6 0 0 1 7 0" /><path d="M12 19h.01" /></>,
    plug: <><path d="M8 2v8" /><path d="M16 2v8" /><path d="M6 10h12" /><path d="M12 22v-6" /><path d="M8 10v2a4 4 0 0 0 8 0v-2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.93 19.07l1.41-1.41" /><path d="M17.66 6.34l1.41-1.41" /></>,
    wave: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    snow: <><path d="M12 2v20" /><path d="m4.93 4.93 14.14 14.14" /><path d="m19.07 4.93-14.14 14.14" /><path d="M2 12h20" /></>,
    flame: <path d="M8.5 14.5A4.5 4.5 0 0 0 17 12c0-4-5-7-5-10-3 2-5 5-3 8-2-1-4 1-4 4a5 5 0 0 0 10 0c0-1.5-.8-2.7-2-3.4.3 1.8-.9 3.9-2.7 4.4" />,
    fan: <><circle cx="12" cy="12" r="2" /><path d="M12 10c1.7-4 7-4 8 0-2 2-5 2-8 0Z" /><path d="M10.3 13c-4.3.6-6.9-4-4-7 2.8.7 4.3 3.3 4 7Z" /><path d="M13.7 13c2.6 3.4-.1 8-4.1 7.2-.8-2.8.5-5.3 4.1-7.2Z" /></>,
    power: <><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></>
  }

  return <svg {...common}>{paths[name]}</svg>
}

function StatusDot({ state = 'ok' }) {
  return <span className={`status-dot ${state}`} />
}

function Sidebar({ telemetry, activeSection, compact, onSelect, onToggleCompact }) {
  return (
    <aside className={compact ? 'sidebar compact' : 'sidebar'}>
      <div className="brand-row">
        <button
          className="menu-button"
          aria-label={compact ? 'Expand navigation' : 'Collapse navigation'}
          aria-pressed={compact}
          onClick={onToggleCompact}
        >
          <Icon name="menu" />
        </button>
        <div>
          <div className="brand-title">DIY RV <span>PRO</span></div>
          <div className="brand-subtitle">Control System</div>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(([id, label, icon]) => (
          <button
            className={id === activeSection ? 'nav-item active' : 'nav-item'}
            key={id}
            aria-label={label}
            title={label}
            aria-current={id === activeSection ? 'page' : undefined}
            onClick={() => onSelect(id)}
            type="button"
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="status-panel">
        <h2>System Status</h2>
        {telemetry.systemStatus.map(([label, value]) => (
          <div className="status-row" key={label}>
            <span><StatusDot state={value === 'Offline' ? 'warning' : value === 'Not configured' ? 'muted' : 'ok'} />{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
    </aside>
  )
}

function MobileHeader({ telemetry, onOpenMenu }) {
  return (
    <header className="mobile-header">
      <button className="menu-button" aria-label="Open navigation" onClick={onOpenMenu} type="button">
        <Icon name="menu" />
      </button>
      <div>
        <div className="brand-title">DIY RV <span>PRO</span></div>
        <div className="mobile-status-line">
          <StatusDot /> {telemetry.controller.mode === 'simulation' ? 'Demo simulation' : telemetry.controller.online ? 'Connected' : 'Disconnected'}
          <Icon name="wifi" className="wifi-icon" /> {telemetry.wifi.strength}
        </div>
      </div>
      <div className="mobile-clock">
        <strong>{telemetry.time.display.replace(/:\d{2}\s/, ' ')}</strong>
        <span>{telemetry.controller.localIp}</span>
      </div>
    </header>
  )
}

function MobileNavDrawer({ telemetry, activeSection, open, onClose, onSelect }) {
  if (!open) {
    return null
  }

  return (
    <div className="mobile-drawer-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    }}>
      <aside className="mobile-drawer" aria-label="Mobile navigation">
        <div className="mobile-drawer-heading">
          <div>
            <div className="brand-title">DIY RV <span>PRO</span></div>
            <div className="brand-subtitle">Control System</div>
          </div>
          <button className="icon-button" aria-label="Close navigation" onClick={onClose} type="button">x</button>
        </div>
        <nav className="mobile-nav-list">
          {navItems.map(([id, label, icon]) => (
            <button
              className={id === activeSection ? 'mobile-nav-item active' : 'mobile-nav-item'}
              key={id}
              onClick={() => onSelect(id)}
              type="button"
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <section className="mobile-status-panel">
          <h2>System Status</h2>
          {telemetry.systemStatus.map(([label, value]) => (
            <div className="status-row" key={label}>
              <span><StatusDot state={value === 'Offline' ? 'warning' : value === 'Not configured' ? 'muted' : 'ok'} />{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      </aside>
    </div>
  )
}

function BottomNav({ activeSection, onSelect }) {
  const quickItems = navItems.filter(([id]) => ['dashboard', 'climate', 'power', 'automation', 'settings'].includes(id))

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {quickItems.map(([id, label, icon]) => (
        <button
          className={id === activeSection ? 'bottom-nav-item active' : 'bottom-nav-item'}
          key={id}
          aria-current={id === activeSection ? 'page' : undefined}
          onClick={() => onSelect(id)}
          type="button"
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function TopBar({ telemetry, onSelect, onNightMode }) {
  return (
    <header className="top-strip">
      <div className="top-status"><span>Controller:</span><StatusDot state={telemetry.controller.mode === 'simulation' ? 'warning' : telemetry.controller.online ? 'ok' : 'warning'} />{telemetry.controller.mode === 'simulation' ? 'Demo simulation' : telemetry.controller.online ? 'Connected' : 'Disconnected'}</div>
      <div className="top-status"><span>WiFi:</span><Icon name="wifi" className="wifi-icon" />{telemetry.wifi.strength}</div>
      <div className="top-status"><span>Time:</span>{telemetry.time.display}</div>
      <div className="top-status"><span>Date:</span>{telemetry.time.date}</div>
      <div className="top-actions">
        <button aria-label="Alerts" onClick={() => onSelect('notifications')} className="icon-button has-badge"><Icon name="bell" /><span>{telemetry.controller.alerts}</span></button>
        <button aria-label="Settings" onClick={() => onSelect('settings')} className="icon-button"><Icon name="gear" /></button>
        <button aria-label="Night mode" onClick={onNightMode} className="icon-button"><Icon name="moon" /></button>
      </div>
    </header>
  )
}

function BatteryIcon({ level }) {
  return (
    <div className="battery-glyph" aria-label={`Battery ${level}%`}>
      <span style={{ height: `${level}%` }} />
    </div>
  )
}

function MetricCard({ title, children, icon, accent = 'green' }) {
  return (
    <section className={`panel metric metric-${accent}`}>
      <h2>{title}</h2>
      <div className="metric-body">
        {icon}
        <div>{children}</div>
      </div>
    </section>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    }}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose} type="button">x</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function HvacSettingsDialog({ zone, onClose, onSave }) {
  const [draft, setDraft] = useState({
    mode: zone.mode,
    coolSetpointF: zone.coolSetpointF ?? zone.setpointF,
    heatSetpointF: zone.heatSetpointF ?? Math.max(45, zone.setpointF - 6),
    autoDifferentialF: zone.autoDifferentialF ?? 3,
    sensorOffsetF: zone.sensorOffsetF ?? 0
  })

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }))

  return (
    <Modal title={`${zone.name} Settings`} onClose={onClose}>
      <form className="settings-form" onSubmit={async event => {
        event.preventDefault()
        if (saving) return
        if (!availableHvacModes(zone).includes(draft.mode)) { setError('Select a mode supported by the assigned equipment.'); return }
        setSaving(true); setError('')
        try { await onSave(parseHvacSettingsDraft(draft)) }
        catch (failure) { setError(failure.message) }
        finally { setSaving(false) }
      }}>
        <div className="form-grid two">
          <Field label="Mode">
            <select value={draft.mode} onChange={event => update('mode', event.target.value)}>
              {!availableHvacModes(zone).includes(draft.mode) && <option value={draft.mode} disabled>Unavailable: {draft.mode}</option>}
              {availableHvacModes(zone).map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </Field>
          <Field label="Current Temp">
            <input value={`${zone.tempF} F`} disabled />
          </Field>
          <Field label="AC Set Point">
            <input required type="number" min="50" max="95" step="1" value={draft.coolSetpointF} onChange={event => update('coolSetpointF', event.target.value)} />
          </Field>
          <Field label="Heat Set Point">
            <input required type="number" min="40" max="90" step="1" value={draft.heatSetpointF} onChange={event => update('heatSetpointF', event.target.value)} />
          </Field>
          <Field label="Auto Differential">
            <input required type="number" min="1" max="10" step="1" value={draft.autoDifferentialF} onChange={event => update('autoDifferentialF', event.target.value)} />
          </Field>
          <Field label="Sensor Offset">
            <input required type="number" min="-10" max="10" step="0.5" value={draft.sensorOffsetF} onChange={event => update('sensorOffsetF', event.target.value)} />
          </Field>
        </div>
        {error && <p className="config-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save HVAC Settings'}</button>
        </div>
      </form>
    </Modal>
  )
}

function getSystem(targetId, systems = []) {
  return systems.find(system => system.id === targetId) || { id: targetId, label: `Unavailable: ${targetId}`, category: 'Unavailable', commands: [], defaultCommand: 'turnOff' }
}

function getCommand(commandId) {
  return automationCommands[commandId] || automationCommands.turnOff
}

function getSystemsForCategory(category, systems = []) {
  return systems.filter(system => system.category === category)
}

function buildControlAction(previousAction = {}, targetId, commandId, systems) {
  const system = getSystem(targetId, systems)
  const command = getCommand(commandId || system.defaultCommand)
  return {
    ...previousAction,
    category: system.category,
    target: system.id,
    targetLabel: system.label,
    type: command.type,
    command: command.id,
    commandLabel: command.label,
    value: previousAction.value && previousAction.command === command.id ? previousAction.value : command.value
  }
}

function buildRestoreAction(previousReverse = {}, targetId, commandId, systems) {
  const system = getSystem(targetId, systems)
  const command = getCommand(commandId || system.defaultCommand)
  return {
    ...previousReverse,
    target: system.id,
    targetLabel: system.label,
    command: command.id,
    commandLabel: command.label,
    action: `${system.id}.${command.id}`
  }
}

function createAutomationDraft(rule) {
  return structuredClone(rule || {
    id: `automation-${Date.now()}`,
    name: 'New Automation',
    enabled: true,
    trigger: {
      source: 'time.local',
      label: 'Local Time',
      operator: 'between',
      value: '22:00-07:00',
      holdFor: '0 min'
    },
    action: {
      category: 'AC Breakers',
      target: 'breaker.ac.1',
      targetLabel: 'AC Breaker 1',
      type: 'state',
      command: 'open',
      commandLabel: 'Open / Shut Off Circuit',
      value: 'open'
    },
    reverse: {
      enabled: false,
      source: 'time.local',
      operator: 'outside',
      value: '22:00-07:00',
      target: 'breaker.ac.1',
      targetLabel: 'AC Breaker 1',
      command: 'close',
      commandLabel: 'Close / Restore Circuit',
      action: 'breaker.ac.1.close'
    }
  })
}

function AutomationRuleDialog({ rule, onClose, onSave, onDelete, profile }) {
  const systems = controlSystems(profile)
  const automationCategories = [...new Set(systems.map(system => system.category))]
  const [draft, setDraft] = useState(() => createAutomationDraft(rule || { ...createAutomationDraft(), action: buildControlAction({}, 'notification', 'sendAlert', systems), reverse: { ...createAutomationDraft().reverse, target: 'notification', command: 'sendAlert', enabled: false } }))
  const sources = sourceCatalog(profile)
  const [error, setError] = useState('')
  const [pendingOperation, setPendingOperation] = useState('')
  const setRoot = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  const setGroup = (group, key, value) => setDraft(current => ({
    ...current,
    [group]: { ...current[group], [key]: value }
  }))

  const setSource = (group, value) => {
    const label = sources.find(([source]) => source === value)?.[1] || value
    setDraft(current => ({
      ...current,
      [group]: { ...current[group], source: value, label }
    }))
  }
  const selectedActionSystem = getSystem(draft.action.target, systems)
  const selectedActionCategory = selectedActionSystem.category
  const actionSystems = getSystemsForCategory(selectedActionCategory, systems)
  const selectedRestoreSystem = getSystem(draft.reverse.target || draft.action.target, systems)
  const selectedRestoreCategory = selectedRestoreSystem.category
  const restoreSystems = getSystemsForCategory(selectedRestoreCategory, systems)

  const setActionCategory = category => {
    const nextSystem = getSystemsForCategory(category, systems)[0]
    setDraft(current => ({
      ...current,
      action: buildControlAction(current.action, nextSystem.id, nextSystem.defaultCommand, systems)
    }))
  }

  const setActionTarget = targetId => {
    const nextSystem = getSystem(targetId, systems)
    setDraft(current => ({
      ...current,
      action: buildControlAction(current.action, targetId, nextSystem.defaultCommand, systems)
    }))
  }

  const setActionCommand = commandId => {
    setDraft(current => ({
      ...current,
      action: buildControlAction(current.action, current.action.target, commandId, systems)
    }))
  }

  const setRestoreCategory = category => {
    const nextSystem = getSystemsForCategory(category, systems)[0]
    setDraft(current => ({
      ...current,
      reverse: buildRestoreAction({ ...current.reverse, category }, nextSystem.id, nextSystem.defaultCommand, systems)
    }))
  }

  const setRestoreTarget = targetId => {
    const nextSystem = getSystem(targetId, systems)
    setDraft(current => ({
      ...current,
      reverse: buildRestoreAction(current.reverse, targetId, nextSystem.defaultCommand, systems)
    }))
  }

  const setRestoreCommand = commandId => {
    setDraft(current => ({
      ...current,
      reverse: buildRestoreAction(current.reverse, current.reverse.target || current.action.target, commandId, systems)
    }))
  }

  return (
    <Modal title={rule ? 'Edit Automation' : 'Create Automation'} onClose={onClose}>
      <form className="settings-form automation-editor" onSubmit={async event => {
        event.preventDefault()
        if (pendingOperation) return
        setPendingOperation('save')
        setError('')
        try {
          if (!sources.some(([id]) => id === draft.trigger.source) || draft.reverse.enabled && !sources.some(([id]) => id === draft.reverse.source)) throw new Error('Select an available sensor for this rule')
          if (!systems.some(system => system.id === draft.action.target && system.commands.includes(draft.action.command)) || draft.reverse.enabled && !systems.some(system => system.id === draft.reverse.target && system.commands.includes(draft.reverse.command))) throw new Error('Select installed equipment and an available action')
          await onSave(draft)
        } catch (error) { setError(error.message) }
        finally { setPendingOperation('') }
      }}>
        {error && <p role="alert" className="configuration-issues">{error}</p>}
        {(!sources.some(([id]) => id === draft.trigger.source) || selectedActionSystem.category === 'Unavailable' || draft.reverse.enabled && (!sources.some(([id]) => id === draft.reverse.source) || selectedRestoreSystem.category === 'Unavailable')) && <p role="status" className="configuration-issues">This rule references removed or disabled equipment. Select a configured source and action before saving.</p>}
        <div className="form-grid two">
          <Field label="Rule Name">
            <input value={draft.name} onChange={event => setRoot('name', event.target.value)} />
          </Field>
          <Field label="Status">
            <select value={draft.enabled ? 'enabled' : 'disabled'} onChange={event => setRoot('enabled', event.target.value === 'enabled')}>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
        </div>

        <div className="rule-builder-section">
          <h3>If This Parameter</h3>
          <div className="form-grid four">
            <Field label="Sensor / State">
              <select value={draft.trigger.source} onChange={event => setSource('trigger', event.target.value)}>
                {!sources.some(([id]) => id === draft.trigger.source) && <option value={draft.trigger.source} disabled>Unavailable: {draft.trigger.source}</option>}
                {sources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Compare">
              <select value={draft.trigger.operator} onChange={event => setGroup('trigger', 'operator', event.target.value)}>
                {automationOperators.map(operator => <option key={operator} value={operator}>{operator}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <input disabled={draft.trigger.operator === 'changes'} value={draft.trigger.value} onChange={event => setGroup('trigger', 'value', event.target.value)} placeholder={draft.trigger.operator === 'changes' ? 'No threshold needed for changes' : '80, on, 22:00-07:00'} />
            </Field>
            <Field label="Hold For">
              <input value={draft.trigger.holdFor} onChange={event => setGroup('trigger', 'holdFor', event.target.value)} placeholder="5 min" />
            </Field>
          </div>
        </div>

        <div className="rule-builder-section">
          <div className="section-title-row">
            <h3>Then Control This Equipment</h3>
            <span className="section-hint">Select the device, circuit, or notification path and the exact state change.</span>
          </div>
          <div className="form-grid action-grid">
            <Field label="Equipment Group">
              <select value={selectedActionCategory} onChange={event => setActionCategory(event.target.value)}>
                {selectedActionCategory === 'Unavailable' && <option value="Unavailable" disabled>Unavailable equipment</option>}
                {automationCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Equipment / Circuit">
              <select value={draft.action.target} onChange={event => setActionTarget(event.target.value)}>
                {selectedActionSystem.category === 'Unavailable' && <option value={draft.action.target} disabled>{selectedActionSystem.label}</option>}
                {actionSystems.map(system => <option key={system.id} value={system.id}>{system.label}</option>)}
              </select>
            </Field>
            <Field label="Desired State / Change">
              <select value={draft.action.command} onChange={event => setActionCommand(event.target.value)}>
                {!selectedActionSystem.commands.includes(draft.action.command) && <option value={draft.action.command} disabled>Unavailable: {draft.action.command}</option>}
                {selectedActionSystem.commands.map(commandId => {
                  const command = getCommand(commandId)
                  return <option key={command.id} value={command.id}>{command.label}</option>
                })}
              </select>
            </Field>
            <Field label="Value / Message">
              <input value={draft.action.value} onChange={event => setGroup('action', 'value', event.target.value)} placeholder="optional" />
            </Field>
          </div>
          <div className="action-preview">
            <strong>{draft.action.commandLabel}</strong>
            <span>{draft.action.targetLabel}</span>
            <small>Action class: {draft.action.type}</small>
          </div>
        </div>

        <div className="rule-builder-section">
          <div className="section-title-row">
            <h3>Cancel / Restore This Action</h3>
            <label className="inline-check">
              <input type="checkbox" checked={draft.reverse.enabled} onChange={event => setGroup('reverse', 'enabled', event.target.checked)} />
              Enable
            </label>
          </div>
          <div className="form-grid restore-grid">
            <Field label="Sensor / State">
              <select value={draft.reverse.source} onChange={event => setGroup('reverse', 'source', event.target.value)}>
                {!sources.some(([id]) => id === draft.reverse.source) && <option value={draft.reverse.source} disabled>Unavailable: {draft.reverse.source}</option>}
                {sources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Compare">
              <select value={draft.reverse.operator} onChange={event => setGroup('reverse', 'operator', event.target.value)}>
                {automationOperators.map(operator => <option key={operator} value={operator}>{operator}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <input disabled={draft.reverse.operator === 'changes'} value={draft.reverse.value} onChange={event => setGroup('reverse', 'value', event.target.value)} placeholder={draft.reverse.operator === 'changes' ? 'No threshold needed for changes' : 'Comparison value'} />
            </Field>
            <Field label="Restore Group">
              <select value={selectedRestoreCategory} onChange={event => setRestoreCategory(event.target.value)}>
                {selectedRestoreCategory === 'Unavailable' && <option value="Unavailable" disabled>Unavailable equipment</option>}
                {automationCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Restore Equipment">
              <select value={draft.reverse.target || draft.action.target} onChange={event => setRestoreTarget(event.target.value)}>
                {selectedRestoreSystem.category === 'Unavailable' && <option value={selectedRestoreSystem.id} disabled>{selectedRestoreSystem.label}</option>}
                {restoreSystems.map(system => <option key={system.id} value={system.id}>{system.label}</option>)}
              </select>
            </Field>
            <Field label="Restore State / Change">
              <select value={draft.reverse.command || selectedRestoreSystem.defaultCommand} onChange={event => setRestoreCommand(event.target.value)}>
                {!selectedRestoreSystem.commands.includes(draft.reverse.command || selectedRestoreSystem.defaultCommand) && <option value={draft.reverse.command || selectedRestoreSystem.defaultCommand} disabled>Unavailable: {draft.reverse.command || selectedRestoreSystem.defaultCommand}</option>}
                {selectedRestoreSystem.commands.map(commandId => {
                  const command = getCommand(commandId)
                  return <option key={command.id} value={command.id}>{command.label}</option>
                })}
              </select>
            </Field>
            <Field label="Restore Value">
              <input value={draft.reverse.restoreValue || ''} onChange={event => setGroup('reverse', 'restoreValue', event.target.value)} placeholder="optional" />
            </Field>
          </div>
        </div>

        <div className="modal-actions split">
          {rule && <button className="danger-action" type="button" disabled={Boolean(pendingOperation)} onClick={async () => {
            if (pendingOperation) return
            setPendingOperation('delete'); setError('')
            try {await onDelete(rule.id)} catch (error) {setError(error.message)} finally {setPendingOperation('')}
          }}>{pendingOperation === 'delete' ? 'Deleting...' : 'Delete'}</button>}
          <span />
          <button className="secondary-action" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-action" type="submit" disabled={Boolean(pendingOperation)}>{pendingOperation === 'save' ? 'Saving...' : 'Save Automation'}</button>
        </div>
      </form>
    </Modal>
  )
}

const displayNumber = (value, decimals) => Number.isFinite(value) ? decimals === undefined ? value : value.toFixed(decimals) : '—'

function Metrics({ telemetry }) {
  return (
    <section className="metrics-grid" id="section-power">
      <MetricCard title="Battery" icon={<BatteryIcon level={telemetry.battery.stateOfCharge} />} accent="green">
        <div className="big-value green">{displayNumber(telemetry.battery.voltage, 2)} V</div>
        <div className="sub-grid">
          <span>{displayNumber(telemetry.battery.current, 1)} A</span>
          <span>{displayNumber(telemetry.battery.stateOfCharge)}%</span>
        </div>
        <strong className="warning">{telemetry.battery.status}</strong>
        <footer>Temp: {displayNumber(telemetry.battery.temperatureF, 1)} F</footer>
      </MetricCard>

      <MetricCard title="Solar" icon={<Icon name="sun" className="large-icon solar" />} accent="gold">
        <div className="big-value">{displayNumber(telemetry.solar.watts)} W</div>
        <div className="sub-grid"><span>{displayNumber(telemetry.solar.voltage)} V</span><span>{displayNumber(telemetry.solar.current)} A</span></div>
        <footer>Today: {displayNumber(telemetry.solar.todayKwh)} kWh</footer>
      </MetricCard>

      <MetricCard title="Loads" icon={<Icon name="wave" className="large-icon load" />} accent="blue">
        <div className="big-value">{displayNumber(telemetry.loads.watts)} W</div>
        <div className="sub-grid"><span>{displayNumber(telemetry.loads.voltage)} V</span><span>{displayNumber(telemetry.loads.current)} A</span></div>
        <footer>Total: {displayNumber(telemetry.loads.totalKwh)} kWh</footer>
      </MetricCard>

      <MetricCard title="Shore Power" icon={<Icon name="plug" className="large-icon muted" />} accent="green">
        <div className="connected-text">{telemetry.shorePower.connected == null ? 'Unavailable' : telemetry.shorePower.connected ? 'Connected' : 'Disconnected'}</div>
        <div className="sub-grid"><span>{displayNumber(telemetry.shorePower.voltage)} V</span><span>{displayNumber(telemetry.shorePower.current)} A</span></div>
        <footer>{telemetry.shorePower.quality}</footer>
      </MetricCard>

      <MetricCard title="Inverter" icon={<Icon name="wave" className="large-icon cyan" />} accent="cyan">
        <div className="mode-text">{telemetry.inverter.mode}</div>
        <div className="sub-grid"><span>{displayNumber(telemetry.inverter.voltage)} V</span><span>{displayNumber(telemetry.inverter.frequencyHz, 1)} Hz</span></div>
        <footer>Efficiency: {displayNumber(telemetry.inverter.efficiency)}%</footer>
      </MetricCard>

      <section className="panel weather-card">
        <h2>Weather</h2>
        <div className="weather-main">
          <div className="cloud-mark" />
          <div><strong>{displayNumber(telemetry.weather.temperatureF)} F</strong><span>{telemetry.weather.summary}</span></div>
        </div>
        <div className="weather-grid">
          <span>High: {displayNumber(telemetry.weather.highF)} F</span>
          <span>Low: {displayNumber(telemetry.weather.lowF)} F</span>
          <span>Humidity: {displayNumber(telemetry.weather.humidity)}%</span>
          <span>Wind: {displayNumber(telemetry.weather.windMph)} mph</span>
        </div>
      </section>
    </section>
  )
}

function PowerHistory({ data }) {
  return (
    <section className="panel power-history" id="section-history">
      <div className="panel-heading">
        <h2>Power History</h2>
        <div className="legend">
          <span className="green-line">Battery Voltage (V)</span>
          <span className="gold-line">Solar (W)</span>
          <span className="blue-line">Loads (W)</span>
        </div>
      </div>
      <div className="chart-label">V / W</div>
      <ResponsiveContainer width="100%" height={264}>
        <LineChart data={data} margin={{ top: 18, right: 18, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#233147" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#dce6f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#26364f' }} />
          <YAxis yAxisId="left" tick={{ fill: '#dce6f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#26364f' }} domain={[0, 1500]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#dce6f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#26364f' }} domain={[11, 14]} />
          <Tooltip contentStyle={{ background: '#0b1627', border: '1px solid #26364f', borderRadius: 8 }} />
          <Line yAxisId="right" type="monotone" dataKey="battery" stroke="#63e458" strokeWidth={3} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="solar" stroke="#ffb000" strokeWidth={3} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="loads" stroke="#3491ff" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}

function GeneratorPanel({ generator, onDispatch }) {
  const action = generator.running ? 'generator.stop' : 'generator.start'

  return (
    <section className="panel generator-panel" id="section-generator">
      <div className="panel-heading">
        <h2>Generator</h2>
        <button className="compact-action" disabled={!generator.controllable} onClick={() => onDispatch({ type: action })}>
          {generator.running ? 'Stop' : 'Start'}
        </button>
      </div>
      <div className="generator-state">
        <Icon name="truck" className="rv-icon" />
        <strong className={generator.running ? 'green' : 'danger'}>{!generator.configured ? 'Not configured' : generator.running ? 'Running' : 'Stopped'}</strong>
      </div>
      <div className="runtime"><strong>{displayNumber(generator.runHours, 1)} h</strong><span>Run Time</span></div>
      <dl className="detail-list">
        <div><dt>Fuel Type:</dt><dd>{generator.fuelType}</dd></div>
        <div><dt>Start Method:</dt><dd>{generator.startMethod}</dd></div>
        <div><dt>Auto Start:</dt><dd className="green">{generator.autoStart ? 'Enabled' : 'Disabled'}</dd></div>
        <div><dt>Next Start:</dt><dd>{generator.nextStart}</dd></div>
      </dl>
    </section>
  )
}

function EquipmentButton({ icon, label, active, disabled, onClick }) {
  return (
    <button className={active ? 'equipment active' : 'equipment'} aria-label={label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
    </button>
  )
}

function HvacCard({ zone, onDispatch, onConfigure }) {
  const equipment = [
    ['snow', 'Cool', 'ac'],
    ['flame', 'Furnace', 'furnace'],
    ['sun', 'Heat Pump', 'heatPump'],
    ['fan', 'Fan', 'fan'],
    ['gear', 'Auto', 'auto']
  ].filter(([, ,key]) => key === 'auto' ? availableHvacModes(zone).includes('Auto') : zone.availableEquipment?.includes(key))

  return (
    <section className="panel hvac-card">
      <div className="panel-heading compact-heading">
        <h2>{zone.name}</h2>
        <button className="ghost-action" onClick={() => onConfigure(zone)} type="button">Settings</button>
      </div>
      <div className="hvac-main">
        <Icon name="snow" className="snow-icon" />
        <strong>{zone.tempF == null ? 'Unavailable' : zone.tempF} {zone.tempF == null ? '' : 'F'}</strong><span className="sensor-state">{zone.sensorLabel} · {zone.sensorStatus}</span>
        <span>Cool: {zone.coolSetpointF ?? zone.setpointF} F<br />Heat: {zone.heatSetpointF ?? zone.setpointF - 6} F<br />{zone.mode}</span>
      </div>
      <div className="hvac-settings-summary">
        <span>Diff: {zone.autoDifferentialF ?? 3} F</span>
        <span>Offset: {zone.sensorOffsetF > 0 ? '+' : ''}{zone.sensorOffsetF ?? 0} F</span>
      </div>
      <div className="equipment-row">
        {equipment.map(([icon, label, key], index) => (
          <EquipmentButton
            key={`${zone.id}-${label}-${index}`}
            icon={icon}
            label={`${zone.name} ${label}`}
            active={Boolean(zone[key])}
            disabled={zone.controlMode !== 'controller' || !zone[key] && zone.sensorStatus !== 'ok'}
            onClick={() => onDispatch({ type: 'hvac.toggleEquipment', zoneId: zone.id, equipment: key })}
          />
        ))}
      </div>
      <footer><span>{zone.controlMode === 'controller' ? 'Controller managed' : zone.controlMode === 'self-controlled' ? 'Equipment manages itself' : 'Monitoring only'}</span><span>Sensor: {zone.sensorLabel}</span></footer>
    </section>
  )
}

function EventsPanel({ events }) {
  return (
    <section className="panel events-panel">
      <h2>Recent Events</h2>
      {events.map(event => (
        <div className="event-row" key={event.id}>
          <StatusDot state={event.type} />
          <time>{event.time}</time>
          <span>{event.message}</span>
        </div>
      ))}
    </section>
  )
}

function AutomationPanel({ rules, runtime, profile, onDispatch, onEdit, onCreate }) {
  const catalog = {sources: sourceCatalog(profile), systems: controlSystems(profile)}
  return (
    <section className="panel automation-panel" id="section-automation">
      <div className="panel-heading compact-heading">
        <h2>Automation Status</h2>
        <button className="ghost-action" onClick={onCreate} type="button">New Rule</button>
      </div>
      {rules.map(rule => (
        <div className="automation-row" key={rule.id}>
          <Icon name="gear" className="automation-icon" />
          <button className="automation-copy" onClick={() => onEdit(rule)} type="button">
            <strong>{rule.name}</strong>
            <span>{rule.detail}</span>
            <small>{ruleStatus(rule, runtime?.[rule.id], catalog)}</small>
            <small>{rule.action?.commandLabel || rule.action?.command || 'Control'} {'->'} {rule.action?.targetLabel || rule.action?.target || 'Controller'}</small>
          </button>
          <button
            className={rule.enabled ? 'toggle on' : 'toggle'}
            aria-label={`${rule.name} ${rule.enabled ? 'enabled' : 'disabled'}`}
            onClick={() => onDispatch({ type: 'automation.setEnabled', id: rule.id, enabled: !rule.enabled })}
          >
            <span />
          </button>
        </div>
      ))}
      <button className="wide-action" onClick={onCreate} type="button">Build Custom Rule</button>
    </section>
  )
}

function TankPanel({ tanks }) {
  return (
    <section className="panel tank-panel" id="section-tanks">
      <h2>Tanks</h2>
      <div className="tank-columns">
        {tanks.map(tank => (
          <div className="tank-column" key={tank.id}>
            <span>{tank.label}</span>
            <div className="tank-vessel">
              <div className={`tank-fill ${tank.color}`} style={{ height: `${tank.level ?? 0}%` }}>
                {tank.level == null ? 'Unavailable' : `${tank.level}%`}
              </div>
            </div>
            <small>{tank.used ?? '—'} / {tank.capacity} {tank.unit}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function MiniTrend({ telemetry }) {
  const normalized = telemetry.powerHistory.map(item => ({
    time: item.time,
    value: Math.round((item.solar / 10) + item.loads / 8)
  }))

  return (
    <section className="panel mini-trend">
      <h2>Live Load Trend</h2>
      <ResponsiveContainer width="100%" height={86}>
        <AreaChart data={normalized}>
          <Area type="monotone" dataKey="value" stroke="#36a3ff" fill="#0d4c8f" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}

function PageView({ title, eyebrow, description, actions, children }) {
  return (
    <section className="page-view">
      <header className="page-header">
        <div>
          {eyebrow && <span>{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}

export default function App() {
  const controller = useMemo(() => createLocalController(undefined, {storage: import.meta.env.DEV ? window.localStorage : undefined, initialProfile: import.meta.env.DEV ? demoProfile : defaultSystemProfile}), [])
  const [snapshot, setTelemetry] = useState(() => {
    const seed = controller.getTelemetry()
    return import.meta.env.DEV ? seed : {...seed, automationRules:[],events:[],powerHistory:[],controller:{...seed.controller,mode:'device',online:false,firmware:'Unavailable',uptime:'Unavailable',localIp:'Unavailable',alerts:0},wifi:{mode:'Unavailable',ssid:'',strength:'Unavailable',rssi:null}}
  })
  const [apiOnline, setApiOnline] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [editingHvacZone, setEditingHvacZone] = useState(null)
  const [editingAutomationRule, setEditingAutomationRule] = useState(null)
  const [creatingAutomation, setCreatingAutomation] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [systemProfile, setSystemProfile] = useState(() => controller.getConfig().features)
  const [controlError, setControlError] = useState('')
  const [nightMode, setNightMode] = useState(false)
  const [demoBackup, setDemoBackup] = useState(() => { try {return JSON.parse(window.localStorage.getItem('diy-rv-demo-inventory-backup') || 'null')} catch {return null} })
  const [browserSettings, setBrowserSettings] = useState(() => {
    try { return loadNotificationSettings(window.localStorage, controller.getTelemetry().notificationSettings) } catch { return loadNotificationSettings(null) }
  })
  useEffect(() => { controller.setNotificationSettings(browserSettings, {persistSettings:false}) }, [controller, browserSettings])
  const notificationCursor = useRef({initialized:false, ids:new Set()})
  useEffect(() => {
    if (snapshot.controller.mode !== 'device') return
    const cursor = notificationCursor.current
    for (const item of snapshot.notifications || []) {
      if (cursor.initialized && !cursor.ids.has(item.id) && !item.read && browserSettings.desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('DIY RV PRO', {body: item.message}) } catch { setControlError('Browser notification could not be displayed.') }
      }
      cursor.ids.add(item.id)
    }
    cursor.initialized = true
    if (cursor.ids.size > 128) cursor.ids = new Set((snapshot.notifications || []).map(item => item.id))
  }, [snapshot.notifications, snapshot.controller.mode, browserSettings.desktop])
  const telemetry = useMemo(() => projectTelemetry(snapshot, systemProfile), [snapshot, systemProfile])
  useEffect(() => {
    if (apiOnline || snapshot.controller.mode === 'device' || !import.meta.env.DEV) return
    const update = () => { controller.setReadings?.(demoReadings()); setTelemetry(controller.tick()) }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [controller, apiOnline, snapshot.controller.mode])

  useEffect(() => {
    let cancelled = false

    let syncingTelemetry = false
    const syncTelemetry = async () => {
      if (syncingTelemetry || cancelled) return
      syncingTelemetry = true
      try {
        const token = getAdminToken()
        const snapshot = await fetchTelemetry()
        if (token) {
          const config = await fetchConfig(token)
          if (!cancelled) setSystemProfile(config.features)
          const discoveryStartedAt = Date.now()
          const discovery = await requestControllerJson('/api/temperature/devices', {headers: {Authorization: `Bearer ${token}`}}).catch(() => null)
          if (discovery) {
            const devices = discovery.devices
            snapshot.temperatures = devices.flatMap(device => config.features.temperatureZones.filter(sensor => sensor.busId === device.busId && sensor.address?.toLowerCase() === device.address?.toLowerCase()).map(sensor => ({...device, id: sensor.id, sampledAt: sampledAtFromRequest(discoveryStartedAt, device.ageMs)})))
          }
        }
        if (token) {
          const contactsStartedAt = Date.now()
          const contacts = await requestControllerJson('/api/security/inputs', {headers:{Authorization:`Bearer ${token}`}}).catch(() => null)
          snapshot.securityInputs = Array.isArray(contacts?.sensors) ? contacts.sensors.map(sensor => ({...sensor,sampledAt:sampledAtFromRequest(contactsStartedAt, 0)})) : []
        }
        if (!cancelled) {
          setTelemetry({ ...snapshot, controller: { ...snapshot.controller, mode: 'device', online: true } })
          setApiOnline(true)
        }
      } catch {
        if (!cancelled) {
          setApiOnline(false)
          setTelemetry(current => current.controller.mode === 'simulation' || import.meta.env.DEV && current.controller.mode !== 'device' ? current : ({ ...current, controller: { ...current.controller, online: false, mode: 'device' } }))
        }
      } finally {
        syncingTelemetry = false
      }
    }

    syncTelemetry()
    const interval = window.setInterval(syncTelemetry, 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = getAdminToken()

    fetchConfig(token)
      .then(config => {
        if (!cancelled) {
          setSystemProfile(normalizeSystemProfile(config.features))
        }
      })
      .catch(error => {
        // Retain the current inventory; failed hardware reads must not substitute demo defaults.
        if (!cancelled && token) setControlError(error.message || 'Controller configuration could not be refreshed.')
      })

    return () => {
      cancelled = true
    }
  }, [controller])

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
        setEditingHvacZone(null)
        setEditingAutomationRule(null)
        setCreatingAutomation(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const dispatch = async action => {
    setControlError('')
    try {
      const token = getAdminToken()
      if (snapshot.controller.mode === 'device' || !import.meta.env.DEV || token) {
        if (!apiOnline) throw new Error('Controller disconnected. Command was not sent.')
        if (!token) throw new Error('Sign in before sending a control command.')
        await pushControlAction(action, token)
        const confirmed = await fetchTelemetry()
        setTelemetry({ ...confirmed, controller: { ...confirmed.controller, mode: 'device', online: true } })
      } else setTelemetry(controller.dispatch(action))
    } catch (error) { setControlError(error.message); throw error }
  }

  const saveHvacSettings = async settings => {
    await dispatch({
      type: 'hvac.updateSettings',
      zoneId: editingHvacZone.id,
      settings
    })
    setEditingHvacZone(null)
  }

  const saveAutomationRule = async rule => {
    await dispatch({
      type: 'automation.upsert',
      rule
    })
    setEditingAutomationRule(null)
    setCreatingAutomation(false)
  }

  const deleteAutomationRule = async id => {
    await dispatch({
      type: 'automation.delete',
      id
    })
    setEditingAutomationRule(null)
    setCreatingAutomation(false)
  }

  const saveSystemProfile = async profile => {
    const token = getAdminToken()
    const demo = isStandaloneDemo({development:import.meta.env.DEV, online:apiOnline, token, mode:snapshot.controller.mode})
    const saved = await persistSystemProfile(profile, {
      demo,
      token,
      saveRemote: saveConfig
    })
    if (demo) {
      controller.updateConfig({ features: saved.profile })
    }
    setSystemProfile(saved.profile)
    return saved.message
  }

  const applyDemoInventory = profile => {
    if (!import.meta.env.DEV || apiOnline || getAdminToken() || snapshot.controller.mode !== 'simulation') throw new Error('Sample inventory is available only in the standalone demo')
    controller.updateConfig({features:profile})
    setSystemProfile(controller.getConfig().features)
    setTelemetry(controller.tick())
  }
  const loadSampleRv = () => {
    const backup = demoBackup || controller.getConfig().features
    window.localStorage.setItem('diy-rv-demo-inventory-backup', JSON.stringify(backup))
    applyDemoInventory(demoProfile)
    setDemoBackup(backup)
  }
  const selectSection = id => {
    setActiveSection(id)
    setMobileNavOpen(false)

    window.requestAnimationFrame(() => {
      document.getElementById('section-dashboard')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    })
  }

  const renderDashboard = () => (
    <>
      <Metrics telemetry={telemetry} />
      <div className="dashboard-grid">
        <PowerHistory data={telemetry.powerHistory} />
        <GeneratorPanel generator={telemetry.generator} onDispatch={action => { dispatch(action).catch(() => {}) }} />
        <div className="right-stack" id="section-climate">
          {telemetry.hvacZones.map(zone => (
            <HvacCard
              key={zone.id}
              zone={zone}
              onDispatch={action => { dispatch(action).catch(() => {}) }}
              onConfigure={setEditingHvacZone}
            />
          ))}
        </div>
        <EventsPanel events={telemetry.events} />
        <AutomationPanel
          rules={telemetry.automationRules}
          runtime={telemetry.ruleRuntime}
          profile={systemProfile}
          onDispatch={action => { dispatch(action).catch(() => {}) }}
          onEdit={setEditingAutomationRule}
          onCreate={() => setCreatingAutomation(true)}
        />
        <div className="lower-right">
          <TankPanel tanks={telemetry.tanks} />
          <MiniTrend telemetry={telemetry} />
        </div>
      </div>
    </>
  )

  const renderPage = () => {
    if (activeSection === 'notifications') return <NotificationsPanel telemetry={{...snapshot, notificationSettings: browserSettings}} onAcknowledge={id => { if (snapshot.controller.mode === 'device') return dispatch({type:'notification.acknowledge',id}); else { controller.acknowledge(id); setTelemetry(current => ({ ...current, notifications: controller.getTelemetry().notifications, controller: {...current.controller, alerts: controller.getTelemetry().controller.alerts} })) } }} onSettings={settings => { const next = saveNotificationSettings(window.localStorage, browserSettings, settings); controller.setNotificationSettings(next, {persistSettings:false}); setBrowserSettings(next); setTelemetry(current => ({ ...current, notificationSettings: next })) }} />
    if (activeSection === 'setup') {
      return (
        <section className="setup-page" id="section-setup">
          <SetupWizard initialProfile={systemProfile} onSave={saveSystemProfile} onDiscover={async () => {
            if (snapshot.controller.mode !== 'device' && import.meta.env.DEV) return demoReadings().map(reading => ({...reading, busId: 'demo-bus', demo: true}))
            const token = getAdminToken()
            if (!apiOnline || !token) throw new Error('Connect and sign in to discover controller sensors')
            try {
              const result = await requestControllerJson('/api/temperature/devices', {headers: {Authorization: `Bearer ${token}`}})
              if (!Array.isArray(result.devices) || result.devices.some(device => !device || typeof device.busId !== 'string' || typeof device.address !== 'string')) throw new Error('Controller returned invalid sensor discovery data.')
              return result.devices
            } catch (error) {
              if (error.status === 503) throw new Error('Saved bus changes require a controller restart before discovery.')
              throw error
            }
          }} />
        </section>
      )
    }

    if (activeSection === 'dashboard') {
      return renderDashboard()
    }

    if (activeSection === 'climate') {
      return (
        <PageView
          eyebrow="Live control"
          title="Climate"
          description="Dedicated HVAC zone controls, sensor offsets, equipment toggles, and recent climate events."
        >
          <div className="page-grid page-grid-climate">
            {telemetry.hvacZones.map(zone => (
              <HvacCard
                key={zone.id}
                zone={zone}
                onDispatch={action => { dispatch(action).catch(() => {}) }}
                onConfigure={setEditingHvacZone}
              />
            ))}
            <EventsPanel events={telemetry.events.filter(event => /HVAC|Zone|temp|fan|heat|cool/i.test(event.message))} />
          </div>
        </PageView>
      )
    }

    if (activeSection === 'power') {
      return (
        <PageView
          eyebrow="Energy system"
          title="Power"
          description="Battery, solar, inverter, shore power, and live load details in one control workspace."
        >
          <Metrics telemetry={telemetry} />
          <div className="page-grid page-grid-power">
            <PowerHistory data={telemetry.powerHistory} />
            <MiniTrend telemetry={telemetry} />
          </div>
        </PageView>
      )
    }

    if (activeSection === 'tanks') {
      return (
        <PageView
          eyebrow="Water and fluids"
          title="Tanks"
          description="Tank level monitoring with room for calibration, sensor strategy, and alarm settings."
        >
          <div className="page-grid page-grid-tanks">
            <TankPanel tanks={telemetry.tanks} />
            <EventsPanel events={telemetry.events.filter(event => /tank|water|fresh|gray|black|lp/i.test(event.message))} />
          </div>
        </PageView>
      )
    }

    if (activeSection === 'generator') {
      return (
        <PageView
          eyebrow="Power generation"
          title="Generator"
          description="Start/stop control, runtime state, auto-start context, and generator-related activity."
        >
          <div className="page-grid page-grid-generator">
            <GeneratorPanel generator={telemetry.generator} onDispatch={action => { dispatch(action).catch(() => {}) }} />
            <EventsPanel events={telemetry.events.filter(event => /generator|start|stop/i.test(event.message))} />
          </div>
        </PageView>
      )
    }

    if (activeSection === 'automation') {
      return (
        <PageView
          eyebrow="Programming"
          title="Automation"
          description="Build, edit, enable, and disable controller rules without sharing space with the dashboard overview."
          actions={<button className="primary-action" onClick={() => setCreatingAutomation(true)} type="button">New Rule</button>}
        >
          <div className="page-grid page-grid-automation">
            <AutomationPanel
              rules={telemetry.automationRules}
              runtime={telemetry.ruleRuntime}
              profile={systemProfile}
              onDispatch={action => { dispatch(action).catch(() => {}) }}
              onEdit={setEditingAutomationRule}
              onCreate={() => setCreatingAutomation(true)}
            />
            <EventsPanel events={telemetry.events.filter(event => /automation|rule|battery|solar|tank|generator/i.test(event.message))} />
          </div>
        </PageView>
      )
    }

    if (activeSection === 'history') {
      return (
        <PageView
          eyebrow="Trends"
          title="History"
          description="A larger history workspace for trend review and diagnostics."
        >
          <div className="page-grid page-grid-history">
            <PowerHistory data={telemetry.powerHistory} />
            <EventsPanel events={telemetry.events} />
          </div>
        </PageView>
      )
    }

    return (
      <PageView
        eyebrow="Controller"
        title="Settings"
        description="Controller connection state, authentication status, and system-level setup entry points."
      >
        <ControllerSettings telemetry={telemetry} apiOnline={apiOnline} onProfile={profile => setSystemProfile(normalizeSystemProfile(profile))} onSetup={() => selectSection('setup')} onLoadDemo={import.meta.env.DEV && !apiOnline && !getAdminToken() && snapshot.controller.mode === 'simulation' ? loadSampleRv : undefined} onRestoreDemo={demoBackup ? () => applyDemoInventory(demoBackup) : undefined} demoTimezone={controller.getConfig().timezone} onDemoTimezone={timezone => {
          if (!import.meta.env.DEV || apiOnline || getAdminToken() || snapshot.controller.mode !== 'simulation') throw new Error('Demo clock settings are unavailable while connected to a controller.')
          controller.updateConfig({timezone})
          controller.tick()
        }} />
      </PageView>
    )
  }

  return (
    <div className={`${sidebarCompact ? 'app-shell sidebar-is-compact' : 'app-shell'} ${nightMode ? 'night-mode' : ''}`}>
      <Sidebar
        telemetry={telemetry}
        activeSection={activeSection}
        compact={sidebarCompact}
        onSelect={selectSection}
        onToggleCompact={() => setSidebarCompact(value => !value)}
      />
      <main className="dashboard" id="section-dashboard">
        <MobileHeader telemetry={telemetry} onOpenMenu={() => setMobileNavOpen(true)} />
        <TopBar telemetry={telemetry} onSelect={selectSection} onNightMode={() => setNightMode(current => !current)} />
        {controlError && <p role="alert" className="configuration-issues">{controlError}</p>}
        {telemetry.storageError && <p role="alert" className="configuration-issues">{telemetry.storageError}</p>}
        {snapshot.controller.mode === 'simulation' && (snapshot.recoveryRequired || snapshot.recoveryBackupKey) && <button type="button" className="secondary-action" onClick={() => {
          try {
            const payload = window.localStorage.getItem(snapshot.recoveryBackupKey || 'diy-rv-demo-v2')
            if (payload === null) throw new Error('Preserved demo data could not be read.')
            const url = URL.createObjectURL(new Blob([payload], {type:'application/json'}))
            const link = document.createElement('a')
            link.href = url
            link.download = 'diy-rv-demo-recovery.json'
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch (error) { setControlError(error.message || 'Recovery download failed.') }
        }}>Download preserved demo data</button>}
        {snapshot.controller.equipmentMode === 'prototype-simulation' && <div className="demo-banner">Controller prototype · equipment readings and manual controls are simulated · addressed temperature alerts run on the controller</div>}
        {snapshot.controller.mode === 'simulation' && <div className="demo-banner">Demo simulation · equipment actions do not operate hardware · configuration and rules saved in this browser</div>}
        {renderPage()}
        <footer className="footer-strip">
          <span>Firmware: {telemetry.controller.firmware}</span>
          <span>Uptime: {telemetry.controller.uptime}</span>
          <span>Local IP: {telemetry.controller.localIp}</span>
        </footer>
      </main>
      <BottomNav activeSection={activeSection} onSelect={selectSection} />
      <MobileNavDrawer
        telemetry={telemetry}
        activeSection={activeSection}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onSelect={selectSection}
      />
      {editingHvacZone && (
        <HvacSettingsDialog
          zone={editingHvacZone}
          onClose={() => setEditingHvacZone(null)}
          onSave={saveHvacSettings}
        />
      )}
      {(editingAutomationRule || creatingAutomation) && (
        <AutomationRuleDialog
          profile={systemProfile}
          rule={editingAutomationRule}
          onClose={() => {
            setEditingAutomationRule(null)
            setCreatingAutomation(false)
          }}
          onSave={saveAutomationRule}
          onDelete={deleteAutomationRule}
        />
      )}
    </div>
  )
}
