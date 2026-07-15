import i18n, { setLang } from './index'

test('three languages registered, en default', () => {
  expect(i18n.language).toBe('en')
  expect(i18n.t('common:myApartments')).toBe('My Apartments')
  setLang('ka')
  expect(i18n.t('common:myApartments')).toBe('ჩემი აპარტამენტები')
  setLang('ru')
  expect(i18n.t('common:myApartments')).toBe('Мои апартаменты')
  setLang('en')
})
