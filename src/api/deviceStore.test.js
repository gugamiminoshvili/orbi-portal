import { deviceStore } from './deviceStore'

beforeEach(() => {
  localStorage.clear()
})

test('getDeviceUuid returns null when nothing is stored', () => {
  expect(deviceStore.getDeviceUuid()).toBeNull()
})

test('setDeviceUuid then getDeviceUuid round-trips the value', () => {
  deviceStore.setDeviceUuid('11111111-2222-3333-4444-555555555555')
  expect(deviceStore.getDeviceUuid()).toBe('11111111-2222-3333-4444-555555555555')
})

test('setDeviceUuid ignores a nullish value (does not clobber a stored uuid)', () => {
  deviceStore.setDeviceUuid('kept-uuid')
  deviceStore.setDeviceUuid(null)
  deviceStore.setDeviceUuid(undefined)
  expect(deviceStore.getDeviceUuid()).toBe('kept-uuid')
})

test('clear removes the stored uuid', () => {
  deviceStore.setDeviceUuid('some-uuid')
  deviceStore.clear()
  expect(deviceStore.getDeviceUuid()).toBeNull()
})

test('reads/writes the orbi-device-uuid localStorage key directly', () => {
  localStorage.setItem('orbi-device-uuid', 'raw-uuid')
  expect(deviceStore.getDeviceUuid()).toBe('raw-uuid')
})
