// Four registered devices, shaped exactly as adaptDevices() returns them.
//
// The spread is deliberate: a browser registered from this portal (web /
// browser name), a real phone with hardware values, a tablet, and one that
// was registered but never verified — the row whose badge and wording differ
// from the rest.
export const MOCK_DEVICES = [
  {
    uuid: 'b0f2c6a4-1d3e-4f5a-9c7b-2e8d1a4f6c30',
    name: 'Chrome Web Portal',
    manufacturer: 'web',
    model: 'Chrome',
    platform: 'macOS',
    registeredAt: '2026-08-21 09:14:02',
    verified: true,
  },
  {
    uuid: '7a1c5e9d-3b2f-4a86-8d10-5f9e2c7b4a11',
    name: 'iPhone 15 Pro',
    manufacturer: 'Apple',
    model: 'iPhone15,2',
    platform: 'ios',
    registeredAt: '2026-07-03 18:47:31',
    verified: true,
  },
  {
    uuid: 'c4d8b2f1-6e07-49a3-b5c2-8a3f0d6e9b72',
    name: 'Galaxy Tab S9',
    manufacturer: 'Samsung',
    model: 'SM-X710',
    platform: 'android',
    registeredAt: '2026-05-19 11:02:55',
    verified: true,
  },
  {
    uuid: 'e9f3a7c2-8b40-4d1e-a6f5-0c2b7d38e514',
    name: 'Firefox Web Portal',
    manufacturer: 'web',
    model: 'Firefox',
    platform: 'Windows',
    registeredAt: '2026-09-02 20:35:10',
    verified: false,
  },
]
