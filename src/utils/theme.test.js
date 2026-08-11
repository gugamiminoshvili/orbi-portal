import { beforeEach, test, expect } from 'vitest'
import { getTheme, setTheme, DEFAULT_THEME } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('DEFAULT_THEME is light', () => {
  expect(DEFAULT_THEME).toBe('light')
})

test('getTheme defaults to light when nothing is stored', () => {
  expect(getTheme()).toBe('light')
})

test('setTheme persists to localStorage and stamps documentElement.dataset.theme', () => {
  setTheme('dark')
  expect(localStorage.getItem('orbi-theme')).toBe('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(getTheme()).toBe('dark')
})

test('setTheme returns the theme it applied', () => {
  expect(setTheme('light')).toBe('light')
  expect(setTheme('dark')).toBe('dark')
})

test('setTheme falls back to light for an unrecognized value (does not brick the toggle)', () => {
  setTheme('neon')
  expect(getTheme()).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

test('getTheme ignores a corrupted/foreign localStorage value', () => {
  localStorage.setItem('orbi-theme', 'purple')
  expect(getTheme()).toBe('light')
})
