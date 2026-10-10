import { cloneTelemetry, defaultConfig } from '../data/mockTelemetry.js'
import { defaultSystemProfile, normalizeSystemProfile } from '../config/systemProfile.js'
import { projectTelemetry } from './profileTelemetry.js'
import { evaluateRules, validateCondition, durationMs } from './automationEngine.js'
import { controlSystems } from '../config/automationCatalog.js'
import { validateProfile } from '../config/validateProfile.js'
import { normalizeNotificationSettings } from './notificationSettings.js'

const CONTROL_ENDPOINT = '/api/control'
const CONFIG_ENDPOINT = '/api/config'
const TELEMETRY_ENDPOINT = '/api/telemetry'

const supportedActions = new Set([
  'hvac.setMode',
  'hvac.setTarget',
  'hvac.updateSettings',
  'hvac.toggleEquipment',
  'generator.start',
  'generator.stop',
  'automation.setEnabled',
  'automation.upsert',
  'automation.delete',
  'notification.acknowledge'
])

const hvacModes = new Set(['Off', 'Cool', 'Heat', 'Auto', 'Fan'])
const automationOperators = new Set(['=', '!=', '>', '>=', '<', '<=', 'between', 'outside', 'changes'])
const automationActionTypes = new Set(['state', 'command', 'block', 'unblock', 'alert'])
const automationCommandTypes = new Set([
  'turnOn',
  'turnOff',
  'start',
  'stop',
  'open',
  'close',
  'blockOn',
  'blockOff',
  'unblock',
  'setAuto',
  'sendAlert'
])

function validateTimezone(value) {
  if (typeof value !== 'string' || !value || value.length > 39) throw new Error('Enter a valid time zone such as America/Denver')
  try { new Intl.DateTimeFormat('en-US', {timeZone:value}) }
  catch { throw new Error('Enter a valid time zone such as America/Denver') }
}

export function createLocalController(seed = cloneTelemetry(), { storage, initialProfile = defaultSystemProfile } = {}) {
  const demoBaseline = structuredClone(seed)
  let telemetry = seed
  let config = { ...defaultConfig, features: normalizeSystemProfile(initialProfile) }
  let storageError = ''
  const runtime = {}
  const blocked = {}
  let notifications = []
  let notificationSettings = { inApp: true, desktop: false }
  let recoveryRequired = false
  let recoveryPayload = null
  let recoveryBackupKey = ''
  if (storage) {
    try {
      recoveryPayload = storage.getItem('diy-rv-demo-v2')
      const saved = JSON.parse(recoveryPayload || 'null')
      if (saved !== null && saved?.version !== 2) throw new Error('Unsupported saved demo version')
      if (saved?.version === 2) {
        const issues = validateProfile(saved.config?.features)
        if (issues.length) throw new Error('Saved demo configuration needs correction')
        if (!Array.isArray(saved.rules) || saved.rules.length > 64 || !Array.isArray(saved.notifications) || saved.notifications.length > 100) throw new Error('Saved demo lists are invalid')
        const loadedRules = saved.rules.map(normalizeAutomationRule)
        if (new Set(loadedRules.map(rule => rule.id)).size !== loadedRules.length) throw new Error('Saved demo rule identities are duplicated')
        if (saved.notifications.some(item => !item || typeof item.id !== 'string' || !item.id || typeof item.message !== 'string' || typeof item.read !== 'boolean')) throw new Error('Saved notifications are invalid')
        const timezone = saved.config.timezone ?? defaultConfig.timezone
        validateTimezone(timezone)
        if (saved.recoveryBackupKey && (typeof saved.recoveryBackupKey !== 'string' || !/^diy-rv-demo-recovery-[0-9a-f-]{36}$/.test(saved.recoveryBackupKey))) throw new Error('Saved recovery reference is invalid')
        config = { ...defaultConfig, timezone, features: normalizeSystemProfile(saved.config.features) }
        recoveryBackupKey = saved.recoveryBackupKey || ''
        telemetry.automationRules = loadedRules
        notifications = saved.notifications
        notificationSettings = normalizeNotificationSettings(saved.notificationSettings)
        for (const rule of telemetry.automationRules) {
          const savedState = saved.runtime?.[rule.id]
          if (savedState && !rule.action.command.startsWith('block')) runtime[rule.id] = {active: savedState.active === true, since: null}
        }
      }
    } catch (error) {
      recoveryRequired = true
      telemetry.automationRules = []
      storageError = `${error.message}. Saved data is preserved; save a corrected configuration to recover with a backup.`
    }
  }
  let persistedPayload = ''
  const persist = (recover = false) => {
    if (!storage) return true
    if (recoveryRequired && !recover) return false
    try {
      if (recoveryRequired) {
        if (recoveryPayload === null) throw new Error('Saved data could not be read')
        const backupKey = recoveryBackupKey || `diy-rv-demo-recovery-${crypto.randomUUID()}`
        storage.setItem(backupKey, recoveryPayload)
        recoveryBackupKey = backupKey
      }
      const payload = JSON.stringify({ version: 2, config, rules: telemetry.automationRules, notifications, notificationSettings, runtime, recoveryBackupKey })
      if (payload !== persistedPayload) storage.setItem('diy-rv-demo-v2', payload)
      recoveryRequired = false
      persistedPayload = payload; storageError = ''; return true
    }
    catch { storageError = 'Browser storage is unavailable or full. Changes cannot be preserved.'; return false }
  }
  const notify = (message, severity = 'info', ruleId = '') => {
    if (notificationSettings.inApp) {
      notifications.unshift({ id: crypto.randomUUID(), message, severity, ruleId, createdAt: Date.now(), read: false })
      notifications = notifications.slice(0, 100)
    }
    if (notificationSettings.desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('DIY RV PRO simulation', { body: message }) } catch {
        storageError = 'Browser notification could not be displayed. Review browser permissions.'
      }
    }
  }
  const listeners = new Set()

  const emit = () => {
    telemetry.notifications = structuredClone(notifications)
    telemetry.notificationSettings = structuredClone(notificationSettings)
    telemetry.storageError = storageError
    telemetry.recoveryBackupKey = recoveryBackupKey
    telemetry.recoveryRequired = recoveryRequired
    telemetry.controller.alerts = notifications.filter(item => !item.read).length
    const snapshot = structuredClone(telemetry)
    listeners.forEach(listener => listener(snapshot))
  }

  const acknowledge = id => {
    if (!notifications.some(item => item.id === id)) throw new Error('Notification not found')
    const previous = notifications
    notifications = notifications.map(item => item.id === id ? { ...item, read: true } : item)
    if (!persist()) {
      notifications = previous
      emit()
      throw new Error('Acknowledgement could not be saved. Free browser storage and try again.')
    }
    emit()
    return structuredClone(telemetry)
  }
  return {
    getTelemetry() {
      emit()
      return structuredClone(telemetry)
    },
    getConfig() {
      return structuredClone(config)
    },
    updateConfig(nextConfig) {
      if (nextConfig.timezone !== undefined) validateTimezone(nextConfig.timezone)
      const features = normalizeSystemProfile(nextConfig.features || config.features)
      const issues = validateProfile(features)
      if (issues.length) throw new Error(issues.join('; '))
      const previousConfig = config
      const previousTelemetry = structuredClone(telemetry)
      const installed = (profile, section) => (profile[section] || []).some(item => item.enabled)
      for (const [section, group] of [['batteries','battery'], ['solarChargeControllers','solar'], ['inverters','inverter'], ['weatherStations','weather'], ['generators','generator']]) {
        if (installed(features, section) && !installed(config.features, section)) telemetry[group] = structuredClone(demoBaseline[group])
      }
      const hasLoads = profile => installed(profile, 'acBreakers') || installed(profile, 'dcCircuits')
      if (hasLoads(features) && !hasLoads(config.features)) telemetry.loads = structuredClone(demoBaseline.loads)
      const hasPower = profile => installed(profile, 'batteries') || installed(profile, 'solarChargeControllers') || hasLoads(profile)
      if (hasPower(features) && !hasPower(config.features)) telemetry.powerHistory = structuredClone(demoBaseline.powerHistory)
      config = { ...config, ...nextConfig, features }
      if (!persist(true)) {
        config = previousConfig
        telemetry = previousTelemetry
        emit()
        throw new Error('Configuration could not be saved. Free browser storage and try again.')
      }
      emit()
      return structuredClone(config)
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(structuredClone(telemetry))
      return () => listeners.delete(listener)
    },
    setReadings(readings) { telemetry.temperatures = structuredClone(readings) },
    acknowledge,
    setNotificationSettings(settings) {
      for (const key of ['inApp', 'desktop']) if (typeof settings[key] === 'boolean') notificationSettings[key] = settings[key]
      persist(); emit()
    },
    tick(now = Date.now()) {
      telemetry = projectTelemetry(telemetry, config.features, now)
      const timeZone = config.timezone || 'America/Denver'
      const local = new Intl.DateTimeFormat('en-GB', {timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(now)).split(':').map(Number)
      telemetry.localMinute = local[0] * 60 + local[1]
      telemetry.time = { display: new Date(now).toLocaleTimeString('en-US', {timeZone}), date: new Date(now).toLocaleDateString('en-US', {timeZone}) }
      telemetry.controller.uptime = 'Browser session'
      telemetry.controller.localIp = 'Local demo'
      telemetry.controller.online = false
      telemetry.controller.mode = 'simulation'
      telemetry.controller.firmware = 'Demo · 0.1.0'
      // Remove stale interlocks before executing this tick.
      for (const target of Object.keys(blocked)) for (const id of Object.keys(blocked[target])) if (!telemetry.automationRules.some(rule => rule.id === id && rule.enabled)) delete blocked[target][id]
      for (const { rule, action, restoring } of evaluateRules(telemetry.automationRules, telemetry, runtime, now)) {
        try {
          if (!controlSystems(config.features).some(system => system.id === action.target && system.commands.includes(action.command))) throw new Error('Configured equipment target or command is unavailable')
          if (action.command === 'sendAlert') {
            notify(action.value || rule.name, 'info', rule.id)
          } else if (action.command?.startsWith('block')) {
            blocked[action.target] = { ...(blocked[action.target] || {}), [rule.id]: action.command }
          } else if (action.command === 'unblock') {
            delete blocked[action.target]?.[rule.id]
          } else {
            const turnOn = ['turnOn', 'start', 'close', 'setAuto'].includes(action.command)
            const blocks = [...Object.values(blocked[action.target] || {}), ...(action.target === 'generator' ? Object.values(blocked['generator.autoStart'] || {}) : [])]
            if (blocks.includes(turnOn ? 'blockOn' : 'blockOff')) throw new Error('Action prevented by an active blocking rule')
            if (action.target === 'generator') telemetry = applyControlAction(telemetry, {type: turnOn ? 'generator.start' : 'generator.stop'})
            else if (action.target?.startsWith('hvac.')) {
              const [, id, equipment] = action.target.split('.')
              const zone = telemetry.hvacZones.find(item => item.id === id)
              if (!zone || (turnOn && zone.sensorStatus && zone.sensorStatus !== 'ok')) throw new Error('HVAC sensor unavailable')
              if (!['ac', 'furnace', 'heatPump', 'fan', 'auto'].includes(equipment)) throw new Error('Unsupported HVAC target')
              zone[equipment] = turnOn
            } else if (action.target?.startsWith('breaker.')) {
              telemetry.circuits ||= {}; telemetry.circuits[action.target.slice(8)] = turnOn ? 'closed' : 'open'
            } else if (action.target?.startsWith('device.')) {
              if (!controlSystems(config.features).some(system => system.id === action.target && system.commands.includes(action.command))) throw new Error('Configured equipment target is unavailable')
              telemetry.outputStates ||= {}; telemetry.outputStates[action.target] = turnOn
            } else if (['waterPump', 'inverter', 'generator.autoStart'].includes(action.target)) {
              telemetry.outputStates ||= {}; telemetry.outputStates[action.target] = turnOn
            } else throw new Error('Equipment target is unavailable')
          }
          telemetry.events.unshift({ id: crypto.randomUUID(), time: new Date(now).toLocaleTimeString(), type: 'info', message: `${restoring ? 'Restored' : 'Executed'} in simulation: ${rule.name}` })
        } catch (error) {
          Object.assign(runtime[rule.id], {active: restoring, since: null, retryAt: now + 30000, error: error.message})
          notify(`${rule.name}: ${error.message}`, 'warning', rule.id)
        }
      }
      // Disabled/deleted blocking rules no longer impose a stale interlock.
      for (const target of Object.keys(blocked)) for (const id of Object.keys(blocked[target])) if (!telemetry.automationRules.some(rule => rule.id === id && rule.enabled)) delete blocked[target][id]
      telemetry.ruleRuntime = structuredClone(runtime)
      telemetry.events = telemetry.events.slice(0, 100)
      persist(); emit()
      return structuredClone(telemetry)
    },
    dispatch(action) {
      if (action?.type === 'notification.acknowledge') return acknowledge(action.id)
      if (action?.type?.startsWith('generator.') || action?.type?.startsWith('hvac.')) {
        const current = projectTelemetry(telemetry, config.features)
        const systems = controlSystems(config.features)
        let target, command
        if (action.type.startsWith('generator.')) {
          target = 'generator'; command = action.type === 'generator.start' ? 'start' : 'stop'
          if (!systems.some(system => system.id === target)) throw new Error('Configure a controllable generator first')
        } else {
          const zone = current.hvacZones.find(item => item.id === action.zoneId)
          if (!zone || zone.controlMode !== 'controller') throw new Error('HVAC zone is not controller managed')
          if (action.type === 'hvac.toggleEquipment') {
            target = `hvac.${zone.id}.${action.equipment}`
            if (action.equipment !== 'auto' && !systems.some(system => system.id === target)) throw new Error('This HVAC output is not configured')
            command = zone[action.equipment] ? 'turnOff' : 'turnOn'
          } else if ((action.mode || action.settings?.mode) !== 'Off' && zone.sensorStatus !== 'ok') {
            throw new Error('HVAC sensor unavailable')
          }
          if (command === 'turnOn' && zone.sensorStatus !== 'ok') throw new Error('HVAC sensor unavailable')
          const mode = action.mode || action.settings?.mode
          const modeChange = mode !== undefined || action.type === 'hvac.toggleEquipment' && action.equipment === 'auto'
          if (modeChange) {
            const effectiveMode = mode || (zone.auto ? 'Off' : 'Auto')
            const outputs = {Cool:['ac','heatPump'],Heat:['furnace','heatPump'],Fan:['fan'],Auto:['ac','furnace','heatPump','fan'],Off:['ac','furnace','heatPump','fan']}[effectiveMode] || []
            for (const equipment of outputs) {
              const output = `hvac.${zone.id}.${equipment}`
              if (!systems.some(system => system.id === output)) continue
              if (effectiveMode === 'Off' && !zone[equipment]) continue
              const restriction = effectiveMode === 'Off' ? 'blockOff' : 'blockOn'
              if (Object.entries(blocked[output] || {}).some(([id,value]) => value === restriction && current.automationRules.some(rule => rule.id === id && rule.enabled))) throw new Error('HVAC mode prevented by an active blocking rule')
            }
          }
        }
        if (target && command) {
          const enabled = id => current.automationRules.some(rule => rule.id === id && rule.enabled)
          const blocks = Object.entries(blocked[target] || {}).filter(([id]) => enabled(id)).map(([, value]) => value)
          if (target === 'generator') blocks.push(...Object.entries(blocked['generator.autoStart'] || {}).filter(([id]) => enabled(id)).map(([, value]) => value))
          if (blocks.includes(['start', 'turnOn'].includes(command) ? 'blockOn' : 'blockOff')) throw new Error('Command prevented by an active blocking rule')
        }
        telemetry = current
      }
      const previousTelemetry = telemetry
      const isRuleEdit = action.type.startsWith('automation.')
      const ruleId = action.id || action.rule?.id
      const previousRuntime = runtime[ruleId]
      telemetry = applyControlAction(telemetry, action)
      if (isRuleEdit) delete runtime[ruleId]
      const saved = persist()
      if (!saved && isRuleEdit) {
        telemetry = previousTelemetry
        if (previousRuntime === undefined) delete runtime[ruleId]
        else runtime[ruleId] = previousRuntime
        emit()
        throw new Error('Automation change could not be saved. Free browser storage and try again.')
      }
      emit()
      return structuredClone(telemetry)
    }
  }
}

export function applyControlAction(currentTelemetry, action) {
  if (!action || !supportedActions.has(action.type)) {
    throw new Error('Unsupported control action')
  }

  const next = structuredClone(currentTelemetry)

  if (action.type === 'notification.acknowledge') {
    const notification = next.notifications?.find(item => item.id === action.id)
    if (!notification) throw new Error('Notification not found')
    notification.read = true
    next.controller.alerts = next.notifications.filter(item => !item.read).length
  }

  if (action.type === 'generator.start') {
    next.generator.running = true
    next.events.unshift({
      id: Date.now(),
      time: 'Now',
      type: 'info',
      message: 'Generator start requested in simulation'
    })
  }

  if (action.type === 'generator.stop') {
    next.generator.running = false
    next.events.unshift({
      id: Date.now(),
      time: 'Now',
      type: 'warning',
      message: 'Generator stop requested in simulation'
    })
  }

  if (action.type === 'automation.setEnabled') {
    const rule = next.automationRules.find(item => item.id === action.id)
    if (!rule) {
      throw new Error('Automation rule not found')
    }
    if (typeof action.enabled !== 'boolean') throw new Error('Rule enabled must be true or false')
    rule.enabled = action.enabled
  }

  if (action.type === 'automation.upsert') {
    const rule = normalizeAutomationRule(action.rule)
    const existingIndex = next.automationRules.findIndex(item => item.id === rule.id)
    if (existingIndex >= 0) {
      next.automationRules[existingIndex] = rule
    } else {
      next.automationRules.unshift(rule)
    }
    next.events.unshift({
      id: Date.now(),
      time: 'Now',
      type: 'info',
      message: `Automation saved: ${rule.name}`
    })
  }

  if (action.type === 'automation.delete') {
    const existingIndex = next.automationRules.findIndex(item => item.id === action.id)
    if (existingIndex < 0) {
      throw new Error('Automation rule not found')
    }
    const [removed] = next.automationRules.splice(existingIndex, 1)
    next.events.unshift({
      id: Date.now(),
      time: 'Now',
      type: 'warning',
      message: `Automation removed: ${removed.name}`
    })
  }

  if (action.type === 'hvac.setMode') {
    const zone = next.hvacZones.find(item => item.id === action.zoneId)
    if (!zone) {
      throw new Error('HVAC zone not found')
    }
    if (!hvacModes.has(action.mode)) {
      throw new Error('HVAC mode not supported')
    }
    zone.mode = action.mode
    zone.auto = action.mode === 'Auto'
    if (action.mode === 'Off') for (const equipment of ['ac','furnace','heatPump','fan','auto']) zone[equipment] = false
  }

  if (action.type === 'hvac.setTarget') {
    const zone = next.hvacZones.find(item => item.id === action.zoneId)
    if (!zone) {
      throw new Error('HVAC zone not found')
    }
    const target = Number(action.setpointF)
    if (!Number.isFinite(target) || target < 45 || target > 95) {
      throw new Error('HVAC setpoint out of range')
    }
    zone.setpointF = target
  }

  if (action.type === 'hvac.updateSettings') {
    const zone = next.hvacZones.find(item => item.id === action.zoneId)
    if (!zone) {
      throw new Error('HVAC zone not found')
    }

    const coolSetpointF = readNumber(action.settings?.coolSetpointF, 'cool setpoint')
    const heatSetpointF = readNumber(action.settings?.heatSetpointF, 'heat setpoint')
    const autoDifferentialF = readNumber(action.settings?.autoDifferentialF, 'auto differential')
    const sensorOffsetF = readNumber(action.settings?.sensorOffsetF, 'sensor offset')

    if (coolSetpointF < 50 || coolSetpointF > 95 || heatSetpointF < 40 || heatSetpointF > 90) {
      throw new Error('HVAC setpoint out of range')
    }
    if (heatSetpointF >= coolSetpointF) {
      throw new Error('HVAC heat setpoint must be below cool setpoint')
    }
    if (autoDifferentialF < 1 || autoDifferentialF > 10) {
      throw new Error('HVAC differential out of range')
    }
    if (sensorOffsetF < -10 || sensorOffsetF > 10) {
      throw new Error('HVAC sensor offset out of range')
    }
    if (action.settings.mode && !hvacModes.has(action.settings.mode)) {
      throw new Error('HVAC mode not supported')
    }

    zone.coolSetpointF = coolSetpointF
    zone.heatSetpointF = heatSetpointF
    zone.autoDifferentialF = autoDifferentialF
    zone.sensorOffsetF = sensorOffsetF
    zone.mode = action.settings.mode || zone.mode
    zone.setpointF = zone.mode === 'Heat' ? heatSetpointF : coolSetpointF
    zone.auto = zone.mode === 'Auto'
    if (zone.mode === 'Off') for (const equipment of ['ac','furnace','heatPump','fan']) zone[equipment] = false
  }

  if (action.type === 'hvac.toggleEquipment') {
    const zone = next.hvacZones.find(item => item.id === action.zoneId)
    if (!zone || !['ac', 'furnace', 'heatPump', 'fan', 'auto'].includes(action.equipment)) {
      throw new Error('HVAC equipment not found')
    }
    zone[action.equipment] = !zone[action.equipment]
  }

  if (next.automationRules.length > 64) throw new Error('Maximum 64 automation rules')
  next.events = next.events.slice(0, 100)
  return next
}

function readNumber(value, label) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} is invalid`)
  }
  return parsed
}

export function normalizeAutomationRule(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Automation rule is required')
  }
  if (typeof rule.enabled !== 'boolean' || rule.reverse?.enabled !== undefined && typeof rule.reverse.enabled !== 'boolean') throw new Error('Rule and restore enabled flags must be true or false')
  const utf8Length = value => new TextEncoder().encode(value).length
  const id = rule.id === undefined ? crypto.randomUUID().replaceAll('-', '') : rule.id
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(id) || ['constructor','prototype'].includes(id)) throw new Error('Rule identity must use 1–32 letters, digits, hyphens or underscores')
  if (typeof rule.name !== 'string') throw new Error('Automation name must be text')

  const name = String(rule.name || '').trim()
  if (name.length < 3 || utf8Length(name) > 96) {
    throw new Error('Automation name must contain at least 3 characters and at most 96 UTF-8 bytes')
  }

  const trigger = {
    source: String(rule.trigger?.source || '').trim(),
    label: String(rule.trigger?.label || rule.trigger?.source || '').trim(),
    operator: String(rule.trigger?.operator || '').trim(),
    value: String(rule.trigger?.value || '').trim(),
    holdFor: String(rule.trigger?.holdFor || '0 min').trim()
  }

  if (!trigger.source || !automationOperators.has(trigger.operator) || !trigger.value) {
    throw new Error('Automation trigger is incomplete')
  }

  const action = {
    category: String(rule.action?.category || '').trim(),
    type: String(rule.action?.type || '').trim(),
    target: String(rule.action?.target || '').trim(),
    targetLabel: String(rule.action?.targetLabel || rule.action?.target || '').trim(),
    command: String(rule.action?.command || '').trim(),
    commandLabel: String(rule.action?.commandLabel || rule.action?.command || '').trim(),
    value: String(rule.action?.value || '').trim()
  }

  if (!automationActionTypes.has(action.type) || !action.target || !automationCommandTypes.has(action.command)) {
    throw new Error('Automation action is incomplete')
  }

  const reverse = {
    enabled: rule.reverse?.enabled === true,
    source: String(rule.reverse?.source || trigger.source).trim(),
    operator: String(rule.reverse?.operator || '').trim(),
    value: String(rule.reverse?.value || '').trim(),
    category: String(rule.reverse?.category || '').trim(),
    target: String(rule.reverse?.target || action.target).trim(),
    targetLabel: String(rule.reverse?.targetLabel || rule.reverse?.target || action.targetLabel || action.target).trim(),
    command: String(rule.reverse?.command || '').trim(),
    commandLabel: String(rule.reverse?.commandLabel || rule.reverse?.command || '').trim(),
    action: String(rule.reverse?.action || '').trim(),
    restoreValue: String(rule.reverse?.restoreValue || '').trim()
  }
  reverse.action = reverse.action || (reverse.target && reverse.command ? `${reverse.target}.${reverse.command}` : '')
  for (const [value, limit, label] of [[trigger.source,128,'Trigger source'],[trigger.value,256,'Trigger value'],[action.target,128,'Action target'],[action.value,256,'Action value'],[reverse.source,128,'Restore source'],[reverse.value,256,'Restore value'],[reverse.target,128,'Restore target'],[reverse.restoreValue,256,'Restore action value']]) {
    if (utf8Length(value) > limit) throw new Error(`${label} exceeds ${limit} UTF-8 bytes`)
  }
  if (action.command === 'sendAlert' && action.target !== 'notification' || reverse.enabled && reverse.command === 'sendAlert' && reverse.target !== 'notification') throw new Error('Alert actions must target notifications')

  if (reverse.enabled && (!reverse.source || !automationOperators.has(reverse.operator) || !reverse.value || !automationCommandTypes.has(reverse.command) || !reverse.action)) {
    throw new Error('Automation reverse check is incomplete')
  }

  validateCondition(trigger)
  durationMs(trigger.holdFor)
  if (reverse.enabled) validateCondition(reverse)

  return {
    id,
    name,
    detail: `${trigger.label || trigger.source} ${trigger.operator} ${trigger.value}`,
    enabled: rule.enabled,
    trigger,
    action,
    reverse
  }
}

export function getAdminToken() {
  if (typeof window === 'undefined') return ''
  try { return window.sessionStorage.getItem('diy-rv-admin-token') || window.localStorage.getItem('diy-rv-admin-token') || '' } catch { return '' }
}

export async function fetchTelemetry(token = getAdminToken()) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(TELEMETRY_ENDPOINT, { headers })

  if (!response.ok) {
    throw new Error('Telemetry request failed')
  }

  return response.json()
}

export async function fetchConfig(token) {
  const headers = { Accept: 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(CONFIG_ENDPOINT, { headers })

  if (!response.ok) {
    throw new Error('Configuration request failed')
  }

  const config = await response.json()
  return { ...config, features: normalizeSystemProfile(config.features) }
}

export async function pushControlAction(action, token) {
  const response = await fetch(CONTROL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(action)
  })

  if (!response.ok) {
    throw new Error('Control action rejected')
  }

  return response.json()
}

export async function saveConfig(config, token) {
  const response = await fetch(CONFIG_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(config)
  })

  if (!response.ok) {
    throw new Error('Configuration save rejected')
  }

  return response.json()
}
