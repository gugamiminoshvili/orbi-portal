// The reset endpoint's own password policy (backend guide, 2026-08-27):
// at least 8 characters, one upper case letter, one lower case letter, one
// digit, and no spaces. Kept here so the form and any test read the same
// list, in the same order they are shown.
export const MIN_RESET_PASSWORD = 8

export const RESET_RULES = [
  { key: 'length', test: (v) => v.length >= MIN_RESET_PASSWORD },
  { key: 'upper', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', test: (v) => /[a-z]/.test(v) },
  { key: 'number', test: (v) => /[0-9]/.test(v) },
  { key: 'nospace', test: (v) => v.length > 0 && !/\s/.test(v) },
]

export function passwordMeetsRules(value) {
  return RESET_RULES.every((rule) => rule.test(value))
}
