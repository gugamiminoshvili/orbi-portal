// Maps UI language codes (i18next: en/ka/ru) to the API's language codes
// (en/ge/ru) and back. This is the only place that hardcodes the ka<->ge
// mismatch; everywhere else should call these helpers.

const UI_TO_API = { ka: 'ge' }
const API_TO_UI = { ge: 'ka' }

export function langToApi(lng) {
  return UI_TO_API[lng] || lng
}

export function langFromApi(lng) {
  return API_TO_UI[lng] || lng
}
