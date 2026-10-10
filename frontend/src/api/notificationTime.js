export function notificationTimeLabel(item) {
  if (typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) && item.createdAt >= 0 && item.createdAt <= 8640000000000000) return new Date(item.createdAt).toLocaleString()
  if (typeof item.uptimeMs === 'number' && Number.isFinite(item.uptimeMs) && item.uptimeMs >= 0) return `Controller uptime ${Math.floor(item.uptimeMs / 1000)} seconds`
  return 'Time unavailable'
}
