export async function requestNotificationPermission(notification, timeoutMs = 30000) {
  if (!notification) throw new Error('Browser notifications are unavailable in this browser.')
  if (notification.permission === 'granted') return 'granted'
  let timer
  try {
    return await Promise.race([
      notification.requestPermission(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Notification permission is still pending. Check the browser permission prompt or browser settings, then try again.')), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
