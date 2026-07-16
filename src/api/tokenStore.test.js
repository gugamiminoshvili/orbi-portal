import { tokenStore } from './tokenStore'

beforeEach(() => {
  localStorage.clear()
})

test('setTokens/getAccess/getRefresh roundtrip', () => {
  tokenStore.setTokens({ access: 'a1', refresh: 'r1' })
  expect(tokenStore.getAccess()).toBe('a1')
  expect(tokenStore.getRefresh()).toBe('r1')
})

test('hasSession reflects presence of an access token', () => {
  expect(tokenStore.hasSession()).toBe(false)
  tokenStore.setTokens({ access: 'a1', refresh: 'r1' })
  expect(tokenStore.hasSession()).toBe(true)
})

test('clear removes both tokens', () => {
  tokenStore.setTokens({ access: 'a1', refresh: 'r1' })
  tokenStore.clear()
  expect(tokenStore.getAccess()).toBeNull()
  expect(tokenStore.getRefresh()).toBeNull()
  expect(tokenStore.hasSession()).toBe(false)
})

test('getAccess/getRefresh return null when nothing stored', () => {
  expect(tokenStore.getAccess()).toBeNull()
  expect(tokenStore.getRefresh()).toBeNull()
})

test('tokens persist under the orbi- prefixed localStorage keys', () => {
  tokenStore.setTokens({ access: 'a1', refresh: 'r1' })
  expect(localStorage.getItem('orbi-access')).toBe('a1')
  expect(localStorage.getItem('orbi-refresh')).toBe('r1')
})
