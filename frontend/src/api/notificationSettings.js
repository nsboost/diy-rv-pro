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
