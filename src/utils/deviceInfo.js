// Builds the `device_info` object sent to POST /mobileApi/device/ when
// registering this browser as a durable device (Task L2).
//
// GROUND TRUTH from the backend developer (overrides docs/api-reference.md's
// silence on device_info's shape): the object must use EXACTLY these field
// names — device_name, device_manufacturer, device_model, platform — and
// `platform` must be one of the confirmed-live enum values below. A wrong
// field name makes the backend read `None` (previously caused a 500); a
// wrong platform value fails with code -1 "platform is not valid".
//
// This is a browser-only portal, so manufacturer/model detection can't be
// as precise as a native app's — we derive a simple, stable identity from
// the user agent string instead (browser name stands in for device_model).

const ALLOWED_PLATFORMS = ['android', 'ios', 'Linux', 'Windows', 'macOS', 'Win10', 'ipados', 'Android']

function detectBrowserName(ua) {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

// Maps to the confirmed-live enum. Only macOS/Windows/Linux/android/ios are
// actually produced here (per spec) — Linux is the default for anything
// unrecognized (e.g. an unfamiliar desktop OS UA string).
function detectPlatform(ua) {
  if (/iPhone|iPod|iPad/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Linux'
}

// `nav` defaults to the global `navigator` — accepting it as a parameter
// keeps the function trivially testable without stubbing jsdom's navigator.
export function buildDeviceInfo(nav = typeof navigator !== 'undefined' ? navigator : {}) {
  const ua = nav?.userAgent || ''
  const browserName = detectBrowserName(ua)
  const platform = detectPlatform(ua)

  return {
    device_name: `${browserName} Web Portal`,
    device_manufacturer: 'web',
    device_model: browserName,
    platform,
  }
}

export { ALLOWED_PLATFORMS }
