import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { listNotifications, markAllSeen, openNotification } from '../api/endpoints/notifications'
import { unreadCount } from '../api/adapters/notifications'

const NotificationsContext = createContext({
  items: [],
  unread: 0,
  loading: true,
  error: null,
  reload: () => {},
  markAll: async () => {},
  markOne: async () => {},
})

// How often the list is refetched while the tab is in front. The backend
// offers no push channel for the web portal (the push_token endpoint is the
// mobile app's), so a poll is the only way a bell can go red without a
// reload — and once a minute is as fast as an owner needs to hear about a
// ticket reply.
const POLL_MS = 60_000

export function NotificationsProvider({ children }) {
  const { status: authStatus } = useAuth()
  const { i18n } = useTranslation()
  const authed = authStatus === 'authed'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Guards against an in-flight response from a previous language (or from
  // before a sign-out) overwriting a newer one.
  const token = useRef(0)

  const reload = useCallback(async () => {
    if (!authed) {
      setItems([])
      setLoading(false)
      return
    }
    const t = ++token.current
    try {
      const rows = await listNotifications()
      if (t === token.current) {
        setItems(rows)
        setError(null)
      }
    } catch (e) {
      // A failed poll is not worth a toast or an empty list — the bell just
      // keeps showing what it last knew.
      if (t === token.current) setError(e)
    } finally {
      if (t === token.current) setLoading(false)
    }
  }, [authed])

  // The language is part of the request: the backend writes each row in the
  // language it was asked for, so switching the UI has to refetch.
  useEffect(() => {
    reload()
  }, [reload, i18n.language])

  useEffect(() => {
    if (!authed) return undefined
    let id = null
    const start = () => {
      if (id == null) id = setInterval(reload, POLL_MS)
    }
    const stop = () => {
      if (id != null) clearInterval(id)
      id = null
    }
    // A background tab polls nothing. Coming back to the front is itself a
    // moment worth refetching on — that is when the owner is looking.
    const onVisibility = () => {
      if (document.hidden) stop()
      else {
        reload()
        start()
      }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [authed, reload])

  // Both writes update the local rows first: the backend returns no body
  // worth reading, and a red dot that waits for a round trip reads as a
  // broken click.
  const markOne = useCallback(async (id) => {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, seen: true } : r)))
    try {
      await openNotification(id)
    } catch {
      // Left as read locally. The next poll restores the truth if the call
      // really failed, and nothing is lost either way.
    }
  }, [])

  const markAll = useCallback(async () => {
    setItems((rows) => rows.map((r) => (r.seen ? r : { ...r, seen: true })))
    try {
      await markAllSeen()
    } catch {
      // Same as above: the next poll is the correction.
    }
  }, [])

  const value = {
    items,
    unread: unreadCount(items),
    loading,
    error,
    reload,
    markAll,
    markOne,
  }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
