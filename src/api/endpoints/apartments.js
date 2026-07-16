import { USE_MOCK, delay, http } from '../client'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import { BOOSTS, PLANS, planById } from '../mock/plans'
import { adaptFlatDetail, adaptProperty } from '../adapters/apartments'
import { adaptAgreement, adaptTariffs } from '../adapters/internet'

function findApt(id) {
  return APTS.find((a) => a.id === id)
}

// `filters.apartment_type` mirrors the v2 query param verbatim (docs/
// api-reference.md GET /mobileApi/properties/v2/: owner/co_owner/trustee) —
// backward compatible, since the default `{}` sends no query at all (same
// request as the pre-I6 zero-arg call).
export async function listApartments(filters = {}) {
  if (USE_MOCK) {
    await delay()
    return APTS.map((a) => ({ ...a, services: SERVICES[a.id] }))
  }
  const params = new URLSearchParams()
  if (filters.apartment_type) params.set('apartment_type', filters.apartment_type)
  const qs = params.toString()
  const list = await http(`/mobileApi/properties/v2/${qs ? `?${qs}` : ''}`)
  return (list || []).map(adaptProperty)
}

// Real branch merges two calls: the property list (for the correct id/
// project/code/block/balance/services — see adaptProperty) and
// GET /mobileApi/flat/{flat_id}/ (for the detail-only fields adaptFlatDetail
// supplies: building/addr/cadastral/waterCode/apCode). There's no
// single-property-by-id endpoint in the doc, so — same as the mock branch —
// this scans the full list for a match by id (falling back to objectId).
//
// Merge precedence (carried finding from the I4 review): adaptFlatDetail's
// own id/project/code/block must NOT win over the property's — spread the
// flat-detail object FIRST, then the property object, so the property's
// values for those four keys always win while flat-detail's unique fields
// (building/addr/cadastral/waterCode/apCode) still come through untouched.
export async function getApartment(id) {
  if (USE_MOCK) {
    await delay()
    const a = findApt(id)
    return a ? { ...a, services: SERVICES[a.id] } : undefined
  }
  const list = await http('/mobileApi/properties/v2/')
  const match = (list || []).find((p) => String(p.id) === String(id) || String(p.objectId) === String(id))
  if (!match) return undefined
  const property = adaptProperty(match)
  const flatId = match.objectId ?? match.id
  const flatDto = await http(`/mobileApi/flat/${flatId}/`)
  const flatDetail = adaptFlatDetail(flatDto)
  return { ...flatDetail, ...property }
}

// The v1 UI only tracks a single "combined" internet+TV package id (see
// adapters/internet.js's adaptPlanEntry), but /internettv/update_package/
// wants separate tariff_net_id/tariff_tv_id fields (docs/api-reference.md)
// — FLAG: with no per-service tariff ids surfaced anywhere in the v1 data
// model, both fields are sent as the same combined plan id, which is a
// best-effort guess, not a confirmed mapping.
export async function changePackage(aptId, planId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.planId = planId
    internet.tariff = planById(planId).price
    return internet
  }
  const dto = await http('/mobileApi/internettv/update_package/', {
    method: 'POST',
    body: JSON.stringify({
      flat_id: aptId,
      tariff_net_id: planId,
      tariff_tv_id: planId,
      date: new Date().toISOString(),
    }),
  })
  return adaptAgreement(dto)
}

// "boost activation service response" is doc-elided beyond "boost
// activation service response" — no established shape to adapt into, so
// this passes the parsed envelope straight through.
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
  return adaptAgreement(dto)
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
  return adaptAgreement(dto)
}

// New in I6 — not yet wired into a modal (out of this task's UI scope), but
// exposed so ChangePackageModal/BoostModal can move off the static PLANS/
// BOOSTS import in a follow-up once the real endpoints are verified live.
export async function getAgreement(flatId) {
  if (USE_MOCK) {
    await delay()
    const svc = SERVICES[flatId]
    return svc
      ? svc.internet
      : { provider: '—', planId: null, tariff: 0, renewal: '—', daysLeft: 0, cycleDays: 0, boost: null, status: null }
  }
  const dto = await http(`/mobileApi/internettv/?flat=${flatId}`)
  return adaptAgreement(dto)
}

export async function getTariffs() {
  if (USE_MOCK) {
    await delay()
    return { plans: PLANS, boosts: BOOSTS }
  }
  const dto = await http('/mobileApi/internettv/tariff/')
  return adaptTariffs(dto)
}
