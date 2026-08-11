// Session/auth state shared across the app.
//
// MOCK mode (VITE_USE_MOCK=true, the default) must behave exactly like v1:
// no login gate, a fixed mock user, status always 'authed'. This is also
// what the default context value (used by any tree that isn't wrapped in an
// <AuthProvider>, e.g. most existing feature tests) resolves to, so none of
// those tests need to change.
//
// Real mode talks to src/api/auth.js: hydrates from a stored session on
// mount (tokenStore.hasSession() -> getUser()), and exposes login/
// submitVerify/logout that drive the 'anon' | 'verify' | 'authed' status.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as authApi from '../api/auth'
import { tokenStore } from '../api/tokenStore'
import { USE_MOCK, onSessionExpired } from '../api/client'
import { ToastContext } from './ToastContext'

// Mirrors the live /mobileApi/user/ key set (Task L1 capture) so the profile
// page renders the same fields in both modes; `fullname` stays the composed
// display name the sidebar/header read.
const MOCK_USER = {
  id: 23818,
  username: 'guga',
  fullname: 'Guga M.',
  fName: 'Guga',
  lName: 'M.',
  mail: 'guga@example.com',
  phone: '995 591 800 593',
  personalId: 'FE682177',
  regDate: '2024-03-18',
  webAccess: true,
  lang: 'en',
}

const MOCK_CONTEXT_VALUE = {
  user: MOCK_USER,
  status: 'authed',
  mock: true,
  login: async () => ({ status: 'ok', user: MOCK_USER }),
  submitVerify: async () => {},
  logout: async () => {},
}

const AuthContext = createContext(MOCK_CONTEXT_VALUE)

export function AuthProvider({ children, mock = USE_MOCK }) {
  const [user, setUser] = useState(mock ? MOCK_USER : null)
  const [status, setStatus] = useState(mock ? 'authed' : 'anon')
  const { t } = useTranslation()
  // Non-throwing: unlike useToast(), reading the context directly resolves to
  // `null` outside a ToastProvider (e.g. auth.test.jsx's standalone
  // <AuthProvider>) instead of throwing, so the toast below is just skipped.
  const toast = useContext(ToastContext)

  // Spec: a refresh failure (SESSION_EXPIRED) must log the user out and send
  // them to /login, not just leave a rejected request dangling. client.js
  // has no reference to this context, so it fires a subscription instead —
  // flipping status to 'anon' here is enough: RequireAuth redirects to
  // /login on the very next render. Toast is best-effort (skipped if this
  // tree isn't under a ToastProvider) — the redirect alone satisfies the
  // spec either way.
  useEffect(() => {
    if (mock) return undefined
    return onSessionExpired(() => {
      setUser(null)
      setStatus('anon')
      toast?.(t('auth:errors.SESSION_EXPIRED'))
    })
  }, [mock, toast, t])

  // Hydrate from a previously stored session on mount (real mode only).
  useEffect(() => {
    if (mock) return undefined
    if (!tokenStore.hasSession()) return undefined

    let cancelled = false
    authApi
      .getUser()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus('authed')
      })
      .catch(() => {
        if (cancelled) return
        // The stored tokens couldn't produce a user — they're stale. Clear
        // them so tokenStore.hasSession() stops reporting a session.
        tokenStore.clear()
        setStatus('anon')
      })
    return () => {
      cancelled = true
    }
  }, [mock])

  // The /mobileApi/auth/ response only carries a few account fields
  // (user_id, smsPhone, mail, privileged — notably NO fullname), and the
  // verify endpoint returns nothing user-shaped at all. The sidebar footer
  // needs the full profile, so once a session is fully established we fetch
  // /mobileApi/user/ and merge it over whatever login already gave us.
  // Best-effort: a failed profile fetch must not fail the sign-in itself.
  const hydrateProfile = useCallback(async (base = {}) => {
    try {
      const profile = await authApi.getUser()
      setUser({ ...base, ...profile })
    } catch {
      setUser(base)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const result = await authApi.login(username, password)
    setUser(result.user)
    if (result.status === 'verify') {
      setStatus('verify')
    } else {
      setStatus('authed')
      await hydrateProfile(result.user)
    }
    return result
  }, [hydrateProfile])

  const submitVerify = useCallback(async (code) => {
    await authApi.verifyCode(code)
    setStatus('authed')
    await hydrateProfile()
  }, [hydrateProfile])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('anon')
  }, [])

  const value = mock ? MOCK_CONTEXT_VALUE : { user, status, mock, login, submitVerify, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

// Route guard: anonymous (or mid device-verification) users are bounced to
// /login with the attempted location in state, so LoginPage can send them
// back where they were headed once signed in. MOCK mode's default context
// is always 'authed', so it passes straight through.
export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status !== 'authed') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
