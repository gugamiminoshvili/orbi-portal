import { buildDeviceInfo, ALLOWED_PLATFORMS } from './deviceInfo'

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const UNKNOWN_UA = 'SomeExoticOS/1.0'

test('returns exactly the four required field names', () => {
  const info = buildDeviceInfo({ userAgent: CHROME_MAC })
  expect(Object.keys(info).sort()).toEqual(
    ['device_name', 'device_manufacturer', 'device_model', 'platform'].sort()
  )
})

test('every produced platform value is one of the confirmed-live enum', () => {
  const uas = [CHROME_MAC, EDGE_WINDOWS, FIREFOX_LINUX, SAFARI_IPHONE, CHROME_ANDROID, UNKNOWN_UA]
  for (const userAgent of uas) {
    const { platform } = buildDeviceInfo({ userAgent })
    expect(ALLOWED_PLATFORMS).toContain(platform)
  }
})

test('detects macOS + Chrome', () => {
  expect(buildDeviceInfo({ userAgent: CHROME_MAC })).toEqual({
    device_name: 'Chrome Web Portal',
    device_manufacturer: 'web',
    device_model: 'Chrome',
    platform: 'macOS',
  })
})

test('detects Windows + Edge (checked before Chrome, since Edge UA also contains Chrome/)', () => {
  const info = buildDeviceInfo({ userAgent: EDGE_WINDOWS })
  expect(info.platform).toBe('Windows')
  expect(info.device_model).toBe('Edge')
  expect(info.device_name).toBe('Edge Web Portal')
})

test('detects Linux + Firefox', () => {
  const info = buildDeviceInfo({ userAgent: FIREFOX_LINUX })
  expect(info.platform).toBe('Linux')
  expect(info.device_model).toBe('Firefox')
})

test('detects ios + Safari on iPhone', () => {
  const info = buildDeviceInfo({ userAgent: SAFARI_IPHONE })
  expect(info.platform).toBe('ios')
  expect(info.device_model).toBe('Safari')
})

test('detects android + Chrome on an Android device', () => {
  const info = buildDeviceInfo({ userAgent: CHROME_ANDROID })
  expect(info.platform).toBe('android')
})

test('falls back to Linux for an unrecognized platform', () => {
  const info = buildDeviceInfo({ userAgent: UNKNOWN_UA })
  expect(info.platform).toBe('Linux')
  expect(info.device_model).toBe('Browser')
  expect(info.device_name).toBe('Browser Web Portal')
})

test('device_manufacturer is always the literal "web"', () => {
  expect(buildDeviceInfo({ userAgent: CHROME_MAC }).device_manufacturer).toBe('web')
  expect(buildDeviceInfo({ userAgent: UNKNOWN_UA }).device_manufacturer).toBe('web')
})
