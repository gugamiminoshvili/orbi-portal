import { describe, test, expect } from 'vitest'
import { parseEnvFile } from './envFile'

describe('parseEnvFile', () => {
  test('parses simple KEY=VALUE lines', () => {
    expect(parseEnvFile('VITE_API_BASE=https://api.example.com\nVITE_USE_MOCK=false')).toEqual({
      VITE_API_BASE: 'https://api.example.com',
      VITE_USE_MOCK: 'false',
    })
  })

  test('ignores blank lines and full-line comments', () => {
    expect(parseEnvFile('\n# a comment\n\nVITE_API_BASE=x\n# trailing\n')).toEqual({
      VITE_API_BASE: 'x',
    })
  })

  test('strips matching single or double quotes around a value', () => {
    expect(parseEnvFile('A="quoted"\nB=\'single\'\nC="mismatched\'')).toEqual({
      A: 'quoted',
      B: 'single',
      C: '"mismatched\'',
    })
  })

  test('trims surrounding whitespace around key and value', () => {
    expect(parseEnvFile('  VITE_API_BASE   =   https://x  \n')).toEqual({
      VITE_API_BASE: 'https://x',
    })
  })

  test('handles Windows-style CRLF line endings', () => {
    expect(parseEnvFile('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' })
  })

  test('skips lines with no "=" and lines with an empty key', () => {
    expect(parseEnvFile('not-a-line\n=no-key\nA=1')).toEqual({ A: '1' })
  })

  test('a value can itself contain "=" (only the first "=" splits key from value)', () => {
    expect(parseEnvFile('A=1=2=3')).toEqual({ A: '1=2=3' })
  })

  test('later duplicate keys win over earlier ones', () => {
    expect(parseEnvFile('A=1\nA=2')).toEqual({ A: '2' })
  })

  test('returns an empty object for empty input', () => {
    expect(parseEnvFile('')).toEqual({})
  })
})
