// DTO adapters for `/mobileApi/properties/` (and `/properties/v2/`, same
// shape) and `/mobileApi/flat/{flat_id}/` — docs/api-reference.md "Properties,
// content, and complexes". The doc's own example mixes field-name casing
// (apartmentBalance/electricityBalance camelCase, WaterIndication PascalCase,
// room_number/ownership_status snake_case) — these adapters normalize all of
// that into the v1 Apt/services shape the UI already consumes (ApartmentCard,
// ApartmentDetailPage, PayPage, and the 5 service accordions), lifted verbatim
// from reference/orbi-portal-redesign.html via src/api/mock/apartments.js.

// v1's `ownership_status` (and v2's equivalent `apartment_type`: owner/
// co_owner/trustee — same three values, per the doc) → the role labels
// ROLE_STYLE (src/api/mock/apartments.js) knows how to render. Unknown or
// missing status falls back to 'Owner', mirroring the same fallback
// ApartmentCard/ApartmentDetailPage already apply defensively via
// `ROLE_STYLE[apt.role] || ROLE_STYLE.Owner`.
const ROLE_BY_OWNERSHIP = {
  owner: 'Owner',
  co_owner: 'Co-Owner',
  trustee: 'Trusted',
}

// Balances arrive as strings in the doc's example (`"apartmentBalance":"..."`).
// Parse defensively: a missing or non-numeric value becomes 0 rather than
// NaN, since balances flow straight into fmt() (utils/format.js) and
// arithmetic (`neg = balance < 0`, PayPage's `-apt.balance`) that must not see NaN.
function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

// Maps one property record (an element of the `/properties(/v2)/` `result`
// array) into the v1 Apt shape + a `services` object synthesized from the
// four balance/indication fields the list endpoint carries.
export function adaptProperty(dto = {}) {
  return {
    id: dto.id ?? dto.objectId,
    // `objectId` is kept alongside `id` — it's the id `/flat/{flat_id}/`
    // expects, and the property list's own `id` looks like a separate
    // customer-property relation id per the doc example (both present).
    objectId: dto.objectId ?? dto.id,
    project: dto.complex ?? '—',
    code: dto.apartmentName ?? '—',
    block: dto.block ?? '—',
    number: dto.room_number != null ? String(dto.room_number) : '—',
    floor: num(dto.floor),
    area: num(dto.square),
    epcode: dto.epcode ?? '—',
    balance: num(dto.apartmentBalance),
    role: ROLE_BY_OWNERSHIP[dto.ownership_status] || 'Owner',
    services: adaptServicesFromProperty(dto),
  }
}

// The properties list only ever carries 4 balance/indication fields per unit
// (apartmentBalance, electricityBalance, WaterIndication, InternetTVBalanceGEL)
// — see docs/api-reference.md's `/properties/` example. None of the other
// fields the 4 service accordions render (tariff, counter ids, service-start/
// last-updated dates, internet planId/renewal/cycle/boost) has a source field
// here; those arrive from `/internettv/...` and friends (Task I5) and get
// merged on top later. Fallback choice per how each consumer renders the field:
//  - fields piped through fmt() (MaintenanceCard/ElectricityCard/InternetCard
//    balances+tariffs) get numeric 0 — fmt(0) renders a clean "₾0.00" instead
//    of fmt(undefined)'s "₾NaN".
//  - fields rendered as plain text (counter ids, start/updated dates,
//    provider) get the '—' placeholder already used elsewhere in the app
//    (cadastral/waterCode/apCode) for "unknown".
//  - internet.planId/status/boost default to null/falsy so InternetCard's
//    `!s.planId` branch renders its "no active subscription" empty state
//    instead of fabricating an Active/Paused status the source data doesn't
//    actually confirm.
function adaptServicesFromProperty(dto = {}) {
  return {
    maintenance: {
      balance: num(dto.apartmentBalance),
      tariff: 0, // not carried by /properties/
      start: '—', // not carried by /properties/
    },
    water: {
      counter: '—', // not carried by /properties/
      indication: dto.WaterIndication ?? '—',
      updated: '—', // not carried by /properties/
    },
    electricity: {
      counter: '—', // not carried by /properties/
      status: 'Inactive', // conservative default — real status arrives later
      balance: num(dto.electricityBalance),
      updated: '—', // not carried by /properties/
    },
    internet: {
      provider: '—', // not carried by /properties/
      planId: null, // no active-plan info from this endpoint
      tariff: 0,
      renewal: '—',
      daysLeft: 0,
      cycleDays: 0,
      boost: null,
      status: null,
      balance: num(dto.InternetTVBalanceGEL),
    },
  }
}

// Maps `/mobileApi/flat/{flat_id}/`'s "detailed Flat and OneC room
// information" (docs/api-reference.md — the doc gives no field names, so
// these are the plausible Flat/OneC field names in __fixtures__/flat.json)
// into the detail-page-only fields ApartmentDetailPage/PayPage read that
// adaptProperty can't supply: cadastral number, water meter code, the
// door/QR "ap code", the building label, and the street address. Unknown
// fields fall back to '—', same convention as adaptServicesFromProperty.
export function adaptFlatDetail(dto = {}) {
  return {
    id: dto.id ?? dto.flat_id,
    project: dto.complex ?? '—',
    code: dto.apartmentName ?? '—',
    block: dto.block ?? '—',
    building: dto.building_name ?? '—',
    addr: dto.address ?? '—',
    cadastral: dto.cadastral_code ?? '—',
    waterCode: dto.water_code ?? '—',
    apCode: dto.ap_code ?? '—',
  }
}
