import { USE_MOCK, delay, http } from '../client'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'
import { BOOSTS, planById } from '../mock/plans'

function findApt(id) {
  return APTS.find((a) => a.id === id)
}

export async function listApartments() {
  if (USE_MOCK) {
    await delay()
    return APTS.map((a) => ({ ...a, services: SERVICES[a.id] }))
  }
  return http('/apartments')
}

export async function getApartment(id) {
  if (USE_MOCK) {
    await delay()
    const a = findApt(id)
    return a ? { ...a, services: SERVICES[a.id] } : undefined
  }
  return http(`/apartments/${id}`)
}

export async function changePackage(aptId, planId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.planId = planId
    internet.tariff = planById(planId).price
    return internet
  }
  return http(`/apartments/${aptId}/internet/package`, {
    method: 'POST',
    body: JSON.stringify({ planId }),
  })
}

export async function activateBoost(aptId, boostId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    const boost = BOOSTS.find((b) => b.id === boostId)
    internet.boost = { name: boost.name, speed: boost.speed, duration: boost.duration }
    return internet
  }
  return http(`/apartments/${aptId}/internet/boost`, {
    method: 'POST',
    body: JSON.stringify({ boostId }),
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
  return http(`/apartments/${aptId}/internet/pause`, { method: 'POST' })
}

export async function resumeInternet(aptId) {
  if (USE_MOCK) {
    await delay()
    const { internet } = SERVICES[aptId]
    internet.status = 'Active'
    internet.tariff = planById(internet.planId).price
    return internet
  }
  return http(`/apartments/${aptId}/internet/resume`, { method: 'POST' })
}
