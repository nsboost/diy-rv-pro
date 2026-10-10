import { useState } from 'react'

export default function NotificationsPanel({ telemetry, onAcknowledge, onSettings }) {
  const [permissionMessage, setPermissionMessage] = useState('')
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [acknowledgementError, setAcknowledgementError] = useState('')
  const settings = telemetry.notificationSettings || { inApp: true, desktop: false }
  const permission = typeof Notification === 'undefined' ? 'unavailable' : Notification.permission
  const browserStatus = permission === 'unavailable' ? 'Browser notifications are unavailable in this browser.'
    : permission === 'denied' ? 'Browser notifications are blocked. Allow them in browser settings before enabling delivery.'
    : settings.desktop && permission === 'granted' ? 'Browser notifications are enabled while this dashboard is open.'
    : settings.desktop ? 'Browser delivery is paused until notification permission is granted.'
    : 'Browser notifications are off.'
  return <section className="panel notification-panel">
    <h2>Notifications</h2>
    <p>Review alerts and acknowledge them here. Browser alerts require permission and this dashboard to remain open.</p>
    <div className="config-form-grid">
      <label className="inline-check"><input type="checkbox" checked={settings.inApp} onChange={event => onSettings({inApp: event.target.checked})} />In-app notifications</label>
      <label className="inline-check"><input type="checkbox" checked={settings.desktop} disabled={requestingPermission} onChange={async event => {
        const enabled = event.target.checked
        if (requestingPermission) return
        if (enabled) {
          if (typeof Notification === 'undefined') { setPermissionMessage('Browser notifications are unavailable in this browser.'); return }
          setRequestingPermission(true)
          try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') { setPermissionMessage('Notifications were not enabled. Allow notifications in browser settings to try again.'); return }
          } catch { setPermissionMessage('Browser notification permission could not be requested.'); return }
          finally { setRequestingPermission(false) }
        }
        setPermissionMessage('')
        onSettings({desktop: enabled})
      }} />Browser notifications</label>
    </div>
    <p role="status">{requestingPermission ? 'Waiting for browser notification permission…' : browserStatus}</p>
    {permissionMessage && <p role="status">{permissionMessage}</p>}
    {acknowledgementError && <p role="alert">{acknowledgementError}</p>}
    {(telemetry.notifications || []).length === 0 && <p>No notifications yet.</p>}
    <div className="notification-list">{(telemetry.notifications || []).map(item => <article className={`notification-item ${item.read ? 'read' : ''}`} key={item.id}>
      <div><strong>{item.severity === 'warning' ? 'Attention' : 'Information'}</strong><p>{item.message}</p><time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : `Controller uptime ${Math.floor((item.uptimeMs || 0) / 1000)} seconds`}</time></div>
      <button className="secondary-action" type="button" disabled={item.read} onClick={async () => {
        setAcknowledgementError('')
        try { await onAcknowledge(item.id) }
        catch (error) { setAcknowledgementError(error.message || 'Acknowledgement failed. Try again.') }
      }}>{item.read ? 'Acknowledged' : 'Acknowledge'}</button>
    </article>)}</div>
  </section>
}
