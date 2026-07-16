// Persists JWT access/refresh tokens in localStorage. This is the only module
// allowed to touch the `orbi-access` / `orbi-refresh` keys directly.

const ACCESS_KEY = 'orbi-access'
const REFRESH_KEY = 'orbi-refresh'

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  setTokens({ access, refresh }) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  hasSession() {
    return Boolean(localStorage.getItem(ACCESS_KEY))
  },
}
