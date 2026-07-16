import { langToApi, langFromApi } from './lang'

test('langToApi maps the UI code ka to the API code ge', () => {
  expect(langToApi('ka')).toBe('ge')
})

test('langToApi is the identity for en and ru', () => {
  expect(langToApi('en')).toBe('en')
  expect(langToApi('ru')).toBe('ru')
})

test('langFromApi maps the API code ge to the UI code ka', () => {
  expect(langFromApi('ge')).toBe('ka')
})

test('langFromApi is the identity for en and ru', () => {
  expect(langFromApi('en')).toBe('en')
  expect(langFromApi('ru')).toBe('ru')
})
