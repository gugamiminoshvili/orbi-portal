import i18n, { setLang } from './index'
import { tokenStore } from '../api/tokenStore'
import { patchUserLang } from '../api/auth'

vi.mock('../api/auth', () => ({ patchUserLang: vi.fn(() => Promise.resolve()) }))

test('three languages registered, en default', () => {
  expect(i18n.language).toBe('en')
  expect(i18n.t('common:myApartments')).toBe('My Apartments')
  setLang('ka')
  expect(i18n.t('common:myApartments')).toBe('ჩემი აპარტამენტები')
  setLang('ru')
  expect(i18n.t('common:myApartments')).toBe('Мои апартаменты')
  setLang('en')
})

describe('setLang backend sync', () => {
  beforeEach(() => {
    tokenStore.clear()
    patchUserLang.mockClear()
  })

  test('does not call patchUserLang when there is no session', () => {
    setLang('ka')

    expect(patchUserLang).not.toHaveBeenCalled()
    setLang('en')
  })

  test('fire-and-forget calls patchUserLang with the new language when a session exists', () => {
    tokenStore.setTokens({ access: 'tok', refresh: 'ref' })

    setLang('ka')

    expect(patchUserLang).toHaveBeenCalledWith('ka')
    setLang('en')
    tokenStore.clear()
  })
})
