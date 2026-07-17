// Endpoints for GET /mobileApi/lockHistory/ (doors-calendar real mode) and
// GET /mobileApi/finance/?response_format=pdf (electricity-report real mode)
// — grouped together per the I6 brief's "finance/locks" bullet, since both
// are thin one-call wrappers with no v1 mock-data equivalent to fall back
// on (the doors calendar's mock branch keeps running on
// utils/doorCount.js's deterministic generator; the electricity-report
// modal's mock branch keeps its fake-generate timeout flow) — see
// adapters/finance.js for the adaptLockHistory shape.
import { USE_MOCK, delay, http } from '../client'
import { adaptLockHistory } from '../adapters/finance'

// `startDate`/`endDate` are optional `YYYY-MM-DD HH:MM:SS` strings (docs/
// api-reference.md). Neither UI caller (DoorsCard/DoorsCalendarModal) is
// gated to call this in mock mode — it's real-mode only — but the mock
// branch still exists so the function is safe to call under either mode.
//
// FLAG (Task L1): which id space `apartmentId` expects is UNCONFIRMED — the
// live capture returned an empty array either way, so it couldn't
// discriminate. DoorsCalendarModal currently passes the flat id (objectId,
// via the `objectId ?? id` fallback) to match /flat/{flat_id}/; if live
// door history stays empty for a flat with door records, try the
// property-relation id instead.
export async function getLockHistory(apartmentId, startDate, endDate) {
  if (USE_MOCK) {
    await delay()
    return { byDay: {}, total: 0 }
  }
  const params = new URLSearchParams({ apartmentId: String(apartmentId) })
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const dto = await http(`/mobileApi/lockHistory/?${params.toString()}`)
  return adaptLockHistory(dto)
}

// Real-mode-only: downloads the PDF electricity statement as a Blob (via
// http()'s existing `blob:true` passthrough). Mock branch resolves `null` —
// ElectricityReportModal's mock path never calls this, it keeps its
// existing fake-generate-then-toast flow. `startDate`/`endDate` map to
// /mobileApi/finance/'s optional query params of the same names (docs/
// api-reference.md) and are omitted when not provided.
export async function downloadElectricityReport(flatId, { startDate, endDate } = {}) {
  if (USE_MOCK) {
    await delay()
    return null
  }
  const params = new URLSearchParams({
    flatId: String(flatId),
    accountType: 'electricity',
    response_format: 'pdf',
  })
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  return http(`/mobileApi/finance/?${params.toString()}`, { blob: true })
}
