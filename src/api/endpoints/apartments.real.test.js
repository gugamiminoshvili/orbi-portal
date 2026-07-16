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
import properties from '../adapters/__fixtures__/properties.json'
import flat from '../adapters/__fixtures__/flat.json'
import agreement from '../adapters/__fixtures__/internettv-agreement.json'
import tariffs from '../adapters/__fixtures__/internettv-tariff.json'

beforeEach(() => {
  http.mockReset()
})

describe('listApartments (real branch)', () => {
  test('GET /mobileApi/properties/v2/ with no params by default', async () => {
    http.mockResolvedValueOnce(properties)
    const result = await listApartments()
    expect(http).toHaveBeenCalledWith('/mobileApi/properties/v2/')
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 501, objectId: 3026, code: 'OCT.A.30.3026' })
  })

  test('adds apartment_type when a role filter is passed', async () => {
    http.mockResolvedValueOnce(properties)
    await listApartments({ apartment_type: 'owner' })
    expect(http).toHaveBeenCalledWith('/mobileApi/properties/v2/?apartment_type=owner')
  })
})

describe('getApartment (real branch)', () => {
  test('merges the matched property with /flat/{flat_id}/, property fields winning on id/project/code/block', async () => {
    http.mockResolvedValueOnce(properties) // GET /mobileApi/properties/v2/
    http.mockResolvedValueOnce(flat) // GET /mobileApi/flat/{objectId}/

    const apt = await getApartment('501')

    expect(http).toHaveBeenNthCalledWith(1, '/mobileApi/properties/v2/')
    expect(http).toHaveBeenNthCalledWith(2, '/mobileApi/flat/3026/')

    // property's values win for the overlapping keys
    expect(apt.id).toBe(501)
    expect(apt.project).toBe('Orbi City')
    expect(apt.code).toBe('OCT.A.30.3026')
    expect(apt.block).toBe('A')
    // flat-detail-only fields still come through
    expect(apt.building).toBe('Orbi City, Block A')
    expect(apt.addr).toBe('Sherif Khimshiashvili St 5, Batumi')
    expect(apt.cadastral).toBe('05.32.03.129.22')
    expect(apt.waterCode).toBe('WTR-3026')
    expect(apt.apCode).toBe('AP-OCTA303026')
    // services synthesized from the property, not clobbered by flat detail
    expect(apt.services.maintenance.balance).toBe(-180)
  })

  test('resolves undefined when no property matches the id', async () => {
    http.mockResolvedValueOnce(properties)
    const apt = await getApartment('nope')
    expect(apt).toBeUndefined()
    expect(http).toHaveBeenCalledTimes(1) // never fetches /flat/ for a non-match
  })
})

describe('changePackage (real branch)', () => {
  test('POSTs update_package with flat_id and the selected plan', async () => {
    http.mockResolvedValueOnce(agreement)
    await changePackage(3026, 'P2')
    const [path, opts] = http.mock.calls[0]
    expect(path).toBe('/mobileApi/internettv/update_package/')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body).toMatchObject({ flat_id: 3026, tariff_net_id: 'P2', tariff_tv_id: 'P2' })
    expect(typeof body.date).toBe('string')
  })
})

describe('pauseInternet / resumeInternet (real branch)', () => {
  test('PATCHes pause:true for pauseInternet', async () => {
    http.mockResolvedValueOnce(agreement)
    await pauseInternet(3026)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/pause/', {
      method: 'PATCH',
      body: JSON.stringify({ flat_id: 3026, pause: true }),
    })
  })

  test('PATCHes pause:false for resumeInternet', async () => {
    http.mockResolvedValueOnce(agreement)
    await resumeInternet(3026)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/pause/', {
      method: 'PATCH',
      body: JSON.stringify({ flat_id: 3026, pause: false }),
    })
  })
})

describe('activateBoost (real branch)', () => {
  test('POSTs tariffId + flat_id to boost-net/activate/', async () => {
    http.mockResolvedValueOnce({ ok: true })
    await activateBoost(3026, 'b65')
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/boost-net/activate/', {
      method: 'POST',
      body: JSON.stringify({ tariffId: 'b65', flat_id: 3026 }),
    })
  })
})

describe('getAgreement / getTariffs (real branch)', () => {
  test('getAgreement fetches /internettv/?flat= and adapts it', async () => {
    http.mockResolvedValueOnce(agreement)
    const result = await getAgreement(3026)
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/?flat=3026')
    expect(result).toMatchObject({ provider: 'Silknet', planId: 'P2', status: 'Active' })
  })

  test('getTariffs fetches /internettv/tariff/ and adapts plans+boosts', async () => {
    http.mockResolvedValueOnce(tariffs)
    const result = await getTariffs()
    expect(http).toHaveBeenCalledWith('/mobileApi/internettv/tariff/')
    expect(result.plans).toHaveLength(4)
    expect(result.boosts).toHaveLength(2)
  })
})
