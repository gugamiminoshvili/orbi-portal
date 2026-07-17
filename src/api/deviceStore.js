// Persists the verified-device UUID in localStorage. This is the only module
// allowed to touch the `orbi-device-uuid` key directly — same single-access-
// point pattern as tokenStore.js for the access/refresh tokens.
//
// Once POST /mobileApi/device/ hands back a device_uuid (registered via
// registerDevice() in auth.js) and it's verified via POST
// /mobileApi/device/verify/, sending that same uuid as `device_id` on
// subsequent POST /mobileApi/auth/ calls lets a repeat login skip the
// device-verification code entirely.

const DEVICE_UUID_KEY = 'orbi-device-uuid'

export const deviceStore = {
  getDeviceUuid() {
    return localStorage.getItem(DEVICE_UUID_KEY)
  },
  setDeviceUuid(uuid) {
    if (!uuid) return
    localStorage.setItem(DEVICE_UUID_KEY, uuid)
  },
  clear() {
    localStorage.removeItem(DEVICE_UUID_KEY)
  },
}
