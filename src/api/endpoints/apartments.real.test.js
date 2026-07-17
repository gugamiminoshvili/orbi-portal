// Real-branch tests for src/api/endpoints/apartments.js — see news.real.test.js
// for the vi.mock('../client', ...) pattern used to force USE_MOCK false.
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

import { http } from '../client'
import {
  listApartments,
  getApartment,
  changePackage,
  activateBoost,
  pauseInternet,
  resumeInternet,
  getAgreement,
  getTariffs,
} from './apartments'
import complexes from '../adapters/__fixtures__/properties.json'
import flat from '../adapters/__fixtures__/flat.json'
import agreement from '../adapters/__fixtures__/internettv-agreement.json'
import tariffs from '../adapters/__fixtures__/internettv-tariff.json'

beforeEach(() => {
  http.mockReset()
})

describe('listApartments (real branch)', () => {
  test('GET /mobileApi/properties/v2/ and flattens complexes to a flat list', async () => {
    http.mockResolvedValueOnce(complexes)
    const result = await listApartments()
    expect(http).toHaveBeenCalledWith('/mobileApi/properties/v2/')
    // fixture: complex "Orbi Plaza" has 0 flats, "Orbi City" has 2
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 748, objectId: 9910, code: 'OCT.A.15.1519', project: 'Orbi City' })
  })

  test('adds apartment_type when a role filter is passed', async () => {
    http.mockResolvedValueOnce(complexes)
    await listApartments({ apartment_type: 'owner' })
    expect(http).toHaveBeenCalledWith('/mobileApi/properties/v2/?apartment_type=owner')
  })
})

describe('getApartment (real branch)', () => {
  test('merges the matched flat with /flat/{objectId}/, property fields winning on overlaps', async () => {
    http.mockResolvedValueOnce(complexes) // GET /mobileApi/properties/v2/
    http.mockResolvedValueOnce(flat) // GET /mobileApi/flat/{objectId}/

    const apt = await getApartment('748')

    expect(http).toHaveBeenNthCalledWith(1, '/mobileApi/properties/v2/')
    expect(http).toHaveBeenNthCalledWith(2, '/mobileApi/flat/9910/')

    // property's values win for the overlapping keys
    expect(apt.id).toBe(748)
    expect(apt.project).toBe('Orbi City')
    expect(apt.code).toBe('OCT.A.15.1519')
    expect(apt.block).toBe('A')
    // flat-detail-only fields still come through
    expect(apt.building).toBe('Orbi Plaza, Block A')
    expect(apt.cadastral).toBe('05.24.03.036.01.543')
    expect(apt.waterCode).toBe('271/4a-205a')
    expect(apt.apCode).toBe('—') // live flat epcode is ""
    // services synthesized from the flat record, not clobbered by flat detail
    expect(apt.services.maintenance.balance).toBe(-1677.73)
    expect(apt.services.internet.planId).toBe(3)
  })

  test('also matches by objectId', async () => {
    http.mockResolvedValueOnce(complexes)
    http.mockResolvedValueOnce(flat)
    const apt = await getApartment('9911')
    expect(apt.id).toBe(749)
  })

  test('resolves undefined when no flat matches the id', async () => {
    http.mockResolvedValueOnce(complexes)
    const apt = await getApartment('nope')
    expect(apt).toBeUndefined()
    expect(http).toHaveBeenCalledTimes(1) // never fetches /flat/ for a non-match
  })
})

describe('changePackage (real branch)', () => {
  test('POSTs update_package with flat_id and the selected plan\'s netId/tvId pair', async () => {
    http.mockResolvedValueOnce(agreement)
    await changePackage(9910, { id: 101, name: 'Package 2', netId: 3, tvId: 9 })
    const [path, opts] = http.mock.calls[0]
    expect(path).toBe('/mobileApi/internettv/update_package/')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body).toMatchObject({ flat_id: 9910, tariff_net_id: 3, tariff_tv_id: 9 })
    expect(typeof body.date).toBe('string')
  })
})

describe('pauseInternet / resumeInternet (real branch)', () => {
  test('PATCHes pause:true for pauseInternet', async () => {
    http.mockResolvedValueOnce(agreement)
    await pauseInternet(9910)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/pause/', {
      method: 'PATCH',
      body: JSON.stringify({ flat_id: 9910, pause: true }),
    })
  })

  test('PATCHes pause:false for resumeInternet', async () => {
    http.mockResolvedValueOnce(agreement)
    await resumeInternet(9910)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/pause/', {
      method: 'PATCH',
      body: JSON.stringify({ flat_id: 9910, pause: false }),
    })
  })
})

describe('activateBoost (real branch)', () => {
  test('POSTs tariffId + flat_id to boost-net/activate/', async () => {
    http.mockResolvedValueOnce({ ok: true })
    await activateBoost(9910, 6)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/boost-net/activate/', {
      method: 'POST',
      body: JSON.stringify({ tariffId: 6, flat_id: 9910 }),
    })
  })
})

describe('getAgreement / getTariffs (real branch)', () => {
  test('getAgreement fetches /internettv/?flat= and adapts the nested orbinet_agreement', async () => {
    http.mockResolvedValueOnce(agreement)
    const result = await getAgreement(9910)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/?flat=9910')
    expect(result).toMatchObject({ planId: 3, planName: 'Package 2', tariff: 70, status: 'Active' })
  })

  test('getAgreement with an empty orbinet_agreement resolves the no-plan shape', async () => {
    http.mockResolvedValueOnce({ internet: { showInternetBanner: true, internetStatus: null }, orbinet_agreement: {}, orbinet_request: {} })
    const result = await getAgreement(9911)
    expect(result.planId).toBeNull()
    expect(result.status).toBeNull()
  })

  test('getTariffs fetches /internettv/tariff/ and adapts plans+boosts', async () => {
    http.mockResolvedValueOnce(tariffs)
    const result = await getTariffs()
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/tariff/')
    expect(result.plans).toHaveLength(2)
    expect(result.plans[0]).toMatchObject({ id: 100, netId: 2, tvId: 8 })
    expect(result.boosts).toHaveLength(1)
  })
})
