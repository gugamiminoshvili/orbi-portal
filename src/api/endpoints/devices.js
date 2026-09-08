import { USE_MOCK, delay, http } from '../client'
import { adaptDevices } from '../adapters/devices'
import { deviceStore } from '../deviceStore'
import { MOCK_DEVICES } from '../mock/devices'

// The browsers and phones this customer has registered. Both endpoints are
// documented and live (docs/api-reference.md, GET and DELETE
// /mobileApi/device/), which is why this page could be built at all.
// Mock mode has to remember a removal, or the row reappears on the next
// render and the flow reads as broken rather than as a stub.
const mockRemoved = new Set()

export async function listDevices() {
  if (USE_MOCK) {
    await delay()
    // The mock marks one row as this browser so the "current device" case is
    // reachable without a real registration.
    const current = deviceStore.getDeviceUuid()
    return MOCK_DEVICES.map((d, i) => (i === 0 && current ? { ...d, uuid: current } : d)).filter(
      (d) => !mockRemoved.has(d.uuid)
    )
  }
  return adaptDevices(await http('/mobileApi/device/'))
}

// Forgetting a device: the next sign-in from it has to pass verification
// again. The caller is expected to have confirmed first — this does not ask.
export async function removeDevice(uuid) {
  if (USE_MOCK) {
    await delay()
    mockRemoved.add(uuid)
    return { ok: true }
  }
  await http(`/mobileApi/device/${encodeURIComponent(uuid)}/`, { method: 'DELETE' })
  return { ok: true }
}
