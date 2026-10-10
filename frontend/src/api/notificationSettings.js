export function normalizeNotificationSettings(value, fallback = { inApp: true, desktop: false }) {
  return Object.fromEntries(['inApp', 'desktop'].map(key => [key,
    typeof value?.[key] === 'boolean' ? value[key] : typeof fallback?.[key] === 'boolean' ? fallback[key] : key === 'inApp'
  ]))
}

export function loadNotificationSettings(storage, fallback) {
  try {
    return normalizeNotificationSettings(JSON.parse(storage?.getItem('diy-rv-notification-settings') || 'null'), fallback)
  } catch {
    return normalizeNotificationSettings(null, fallback)
  }
}

export function saveNotificationSettings(storage, current, changes) {
  const next = normalizeNotificationSettings(changes, current)
  try {
    if (!storage) throw new Error('Storage unavailable')
    storage.setItem('diy-rv-notification-settings', JSON.stringify(next))
  } catch {
    throw new Error('Browser notification preferences could not be saved. Free browser storage and try again.')
  }
  return next
}
