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
import * as authApi from '../api/auth'
import { tokenStore } from '../api/tokenStore'
import { USE_MOCK } from '../api/client'

const MOCK_USER = { fullname: 'Guga M.' }

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
        setStatus('anon')
      })
    return () => {
      cancelled = true
    }
  }, [mock])

  const login = useCallback(async (username, password) => {
    const result = await authApi.login(username, password)
    setUser(result.user)
    setStatus(result.status === 'verify' ? 'verify' : 'authed')
    return result
  }, [])

  const submitVerify = useCallback(async (code) => {
    await authApi.verifyCode(code)
    setStatus('authed')
  }, [])

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
