import { USE_MOCK, delay, http } from '../client'
import { adaptNotifications } from '../adapters/notifications'
import { langToApi } from '../../utils/lang'
import i18n from '../../i18n'
import { MOCK_NOTIFICATIONS } from '../mock/notifications'

// The backend writes each row in the language asked for, so the list is
// refetched when the UI language changes rather than translated here.
//
// Mock mode has to remember what was read, or the unread count resets on
// every poll and the feature reads as broken rather than as a stub.
const mockSeen = new Set()

export async function listNotifications() {
  if (USE_MOCK) {
    await delay()
    return adaptNotifications(
      MOCK_NOTIFICATIONS.map((n) => (mockSeen.has(n.id) ? { ...n, seen: true } : n))
    )
  }
  const lang = langToApi(i18n.language || 'en')
  return adaptNotifications(await http(`/mobileApi/notification/?lang=${encodeURIComponent(lang)}`))
}

// Reading one. GET /{id}/ is what marks a single row seen — there is no PATCH
// for it — so this is a read with a side effect by the backend's design.
export async function openNotification(id) {
  if (USE_MOCK) {
    await delay()
    mockSeen.add(id)
    return { ok: true }
  }
  const lang = langToApi(i18n.language || 'en')
  await http(`/mobileApi/notification/${id}/?lang=${encodeURIComponent(lang)}`)
  return { ok: true }
}

export async function markAllSeen() {
  if (USE_MOCK) {
    await delay()
    MOCK_NOTIFICATIONS.forEach((n) => mockSeen.add(n.id))
    return { ok: true }
  }
  await http('/mobileApi/notification/seen/', { method: 'POST' })
  return { ok: true }
}
