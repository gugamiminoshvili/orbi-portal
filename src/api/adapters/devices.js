// DTO adapter for `GET /mobileApi/device/` (docs/api-reference.md).
//
// The payload nests the device one level down and repeats the customer link
// at the top: `{id, customer, verified, device: {id, device, device_uuid,
// inserted_at, manufacturer, model, platform}}`. Flattened here, because
// nothing in the UI has any use for the join row.
//
// `device` (the inner string field) is the NAME the client sent as
// `device_name` when it registered — this portal sends "<Browser> Web
// Portal" (utils/deviceInfo.js). `model` is the browser name and
// `manufacturer` is the literal 'web' for anything registered from here; a
// phone app fills those with real hardware values, so both spellings have
// to render.
export function adaptDevice(dto = {}) {
  const d = dto.device || {}
  return {
    uuid: d.device_uuid ?? null,
    name: d.device ?? null,
    manufacturer: d.manufacturer ?? null,
    model: d.model ?? null,
    platform: d.platform ?? null,
    // "YYYY-MM-DD HH:MM:SS" on the wire, like every other timestamp here.
    registeredAt: d.inserted_at ?? null,
    // The join row's flag, not the device's: it says whether THIS customer
    // has verified this device, which is the question the page asks.
    verified: Boolean(dto.verified),
  }
}

export function adaptDevices(dto) {
  // A device with no uuid cannot be identified or removed, so it is not a
  // row anyone could act on.
  return (Array.isArray(dto) ? dto : []).map(adaptDevice).filter((d) => d.uuid)
}
