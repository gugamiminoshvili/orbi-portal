import { USE_MOCK, delay, http } from '../client'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import { BOOSTS, PLANS, planById } from '../mock/plans'
import { adaptFlatDetail, adaptProperty } from '../adapters/apartments'
import { adaptAgreement, adaptTariffs } from '../adapters/internet'

function findApt(id) {
  return APTS.find((a) => a.id === id)
}

// `/mobileApi/properties/v2/` really returns COMPLEXES `[{id, name,
// flats: [...]}]` (Task L1 live capture) — flattened here into the flat list
// adaptProperty maps. Each flat already carries its own `complex` name; the
// parent complex's `name` is provided as a fallback for any flat that
// doesn't.
function flattenComplexes(list) {
  return (list || []).flatMap((c) => (c.flats || []).map((flat) => ({ complex: c.name, ...flat })))
}

// `filters.apartment_type` mirrors the v2 query param verbatim (docs/
// api-reference.md GET /mobileApi/properties/v2/: owner/co_owner/trustee) —
// backward compatible, since the default `{}` sends no query at all.
export async function listApartments(filters = {}) {
  if (USE_MOCK) {
    await delay()
    return APTS.map((a) => ({ ...a, services: SERVICES[a.id] }))
  }
  const params = new URLSearchParams()
  if (filters.apartment_type) params.set('apartment_type', filters.apartment_type)
  const qs = params.toString()
  const list = await http(`/mobileApi/properties/v2/${qs ? `?${qs}` : ''}`)
  return flattenComplexes(list).map(adaptProperty)
}

// Real branch merges two calls: the (flattened) property list — for the
// correct id/project/code/block/balance/services, see adaptProperty — and
// GET /mobileApi/flat/{flat_id}/ for the detail-only fields adaptFlatDetail
// supplies (building/cadastral/waterCode/apCode). There's no
// single-property-by-id endpoint, so — same as the mock branch — this scans
// the full list for a match by id (falling back to objectId).
//
// Merge precedence (carried finding from the I4 review): adaptFlatDetail's
// own id/project/code/block/role must NOT win over the property's — spread
// the flat-detail object FIRST, then the property object, so the property's
// values for the overlapping keys always win while flat-detail's unique
// fields (building/cadastral/waterCode/apCode) still come through untouched.
export async function getApartment(id) {
  if (USE_MOCK) {
    await delay()
    const a = findApt(id)
    return a ? { ...a, services: SERVICES[a.id] } : undefined
  }
  const list = await http('/mobileApi/properties/v2/')
  const match = flattenComplexes(list).find(
    (p) => String(p.id) === String(id) || String(p.objectId) === String(id)
  )
  if (!match) return undefined
  const property = adaptProperty(match)
  const flatId = match.objectId ?? match.id
  const flatDto = await http(`/mobileApi/flat/${flatId}/`)
  const flatDetail = adaptFlatDetail(flatDto)
  return { ...flatDetail, ...property }
}

// The live agreement/tariff payloads resolved the backend-Q the I5 code
// flagged: a plan is TWO tariffs. The combined-catalog entry carries
// `internet_id`/`tv_id` (adaptTariffs surfaces them as netId/tvId), and
// /internettv/update_package/ wants them as `tariff_net_id`/`tariff_tv_id`.
// `plan` is therefore the selected plan OBJECT (ChangePackageModal passes
// it), not a bare id.
export async function changePackage(aptId, plan) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.planId = plan.id
    internet.tariff = planById(plan.id).price
    return internet
  }
  const dto = await http('/mobileApi/internettv/update_package/', {
    method: 'POST',
    body: JSON.stringify({
      flat_id: aptId,
      tariff_net_id: plan.netId,
      tariff_tv_id: plan.tvId,
      date: new Date().toISOString(),
    }),
  })
  return adaptMutationAgreement(dto)
}

// Mutation responses (update_package/pause) are still doc-elided. The live
// GET /internettv/ shape wraps the agreement as {internet, orbinet_agreement,
// orbinet_request} — unwrap that same wrapper defensively when present, else
// assume the body IS the agreement serializer.
function adaptMutationAgreement(dto) {
  return adaptAgreement(dto?.orbinet_agreement ?? dto ?? {})
}

// "boost activation service response" is doc-elided beyond its name — no
// established shape to adapt into, so this passes the parsed envelope
// straight through.
export async function activateBoost(aptId, boostId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    const boost = BOOSTS.find((b) => b.id === boostId)
    internet.boost = { name: boost.name, speed: boost.speed, duration: boost.duration }
    return internet
  }
  return http('/mobileApi/internettv/boost-net/activate/', {
    method: 'POST',
    body: JSON.stringify({ tariffId: boostId, flat_id: aptId }),
  })
}

export async function pauseInternet(aptId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.status = 'Paused'
    internet.tariff = 6
    return internet
  }
  const dto = await http('/mobileApi/internettv/pause/', {
    method: 'PATCH',
    body: JSON.stringify({ flat_id: aptId, pause: true }),
  })
  return adaptMutationAgreement(dto)
}

export async function resumeInternet(aptId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.status = 'Active'
    internet.tariff = planById(internet.planId).price
    return internet
  }
  const dto = await http('/mobileApi/internettv/pause/', {
    method: 'PATCH',
    body: JSON.stringify({ flat_id: aptId, pause: false }),
  })
  return adaptMutationAgreement(dto)
}

// GET /mobileApi/internettv/?flat= — the live-captured `result` is a wrapper
// `{internet: {showInternetBanner, internetStatus}, orbinet_agreement: {...},
// orbinet_request: {}}` with the agreement serializer nested under
// `orbinet_agreement` ({} when there's no plan). adaptAgreement turns it
// into the services.internet subscriber-state shape.
export async function getAgreement(flatId) {
  if (USE_MOCK) {
    await delay()
    const svc = SERVICES[flatId]
    return svc
      ? svc.internet
      : { provider: '—', planId: null, tariff: 0, renewal: '—', daysLeft: 0, cycleDays: 0, boost: null, status: null }
  }
  const dto = await http(`/mobileApi/internettv/?flat=${flatId}`)
  return adaptMutationAgreement(dto)
}

export async function getTariffs() {
  if (USE_MOCK) {
    await delay()
    return { plans: PLANS, boosts: BOOSTS }
  }
  const dto = await http('/mobileApi/internettv/tariff/')
  return adaptTariffs(dto)
}
