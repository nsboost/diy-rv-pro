import { useState } from 'react'

export default function NotificationsPanel({ telemetry, onAcknowledge, onSettings }) {
  const [permissionMessage, setPermissionMessage] = useState('')
  const settings = telemetry.notificationSettings || { inApp: true, desktop: false }
  return <section className="panel notification-panel">
    <h2>Notifications</h2>
    <p>Review alerts and acknowledge them here. Browser alerts require permission and this dashboard to remain open.</p>
    <div className="config-form-grid">
      <label className="inline-check"><input type="checkbox" checked={settings.inApp} onChange={event => onSettings({inApp: event.target.checked})} />In-app notifications</label>
      <label className="inline-check"><input type="checkbox" checked={settings.desktop} onChange={async event => {
        const enabled = event.target.checked
        if (enabled) {
          if (typeof Notification === 'undefined') { setPermissionMessage('Browser notifications are unavailable in this browser.'); return }
          try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') { setPermissionMessage('Notifications were not enabled. Allow notifications in browser settings to try again.'); return }
          } catch { setPermissionMessage('Browser notification permission could not be requested.'); return }
        }
        setPermissionMessage('')
        onSettings({desktop: enabled})
      }} />Browser notifications</label>
    </div>
    {permissionMessage && <p role="status">{permissionMessage}</p>}
    {(telemetry.notifications || []).length === 0 && <p>No notifications yet.</p>}
    <div className="notification-list">{(telemetry.notifications || []).map(item => <article className={`notification-item ${item.read ? 'read' : ''}`} key={item.id}>
      <div><strong>{item.severity === 'warning' ? 'Attention' : 'Information'}</strong><p>{item.message}</p><time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : `Controller uptime ${Math.floor((item.uptimeMs || 0) / 1000)} seconds`}</time></div>
      <button className="secondary-action" type="button" disabled={item.read} onClick={() => onAcknowledge(item.id)}>{item.read ? 'Acknowledged' : 'Acknowledge'}</button>
    </article>)}</div>
  </section>
}
