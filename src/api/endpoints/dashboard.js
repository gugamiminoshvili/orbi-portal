// Endpoints for the Phase 3 dashboard data layer: communals (utilities +
// maintenance + per-apartment detail), NBG currency rates, the Contracts
// tile (tournover/schedule), and unpaid invoices. See adapters/dashboard.js
// for the DTO shapes/FLAGs and docs/specs/2026-07-17-dashboard-multipay-design.md
// for the design decisions.
import { USE_MOCK, delay, http } from '../client'
import { ApiError } from '../errors'
import { adaptCommunals, adaptRate, adaptContractsSummary, adaptUnpaidInvoices } from '../adapters/dashboard'
import { RATES, mockCommunals, mockContractsSummary, mockUnpaidInvoices } from '../mock/dashboard'

export async function getCommunals() {
  if (USE_MOCK) {
    await delay()
    return mockCommunals()
  }
  const dto = await http('/mobileApi/dashboard/communals/')
  return adaptCommunals(dto)
}

// `YYYY-MM-DD` in the CALLER's local time zone — the live probe (Task P3-1)
// confirmed the backend wants "today" in this format; a UTC-pinned date
// (like adapters/finance.js's dayKey) isn't appropriate here since the rate
// is genuinely tied to the caller's calendar day, not a historical record.
function todayYMD() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Pair labels + the `currency` query value each is probed with — see
// adaptRate's comment for how this param shape was found live.
const RATE_CURRENCIES = [
  { pair: 'USD/GEL', currency: 'USD' },
  { pair: 'EUR/GEL', currency: 'EUR' },
  // RUB removed at owner request (2026-07-21).
]

// Three GETs (one per currency) rather than a single batched call — the doc
// only documents a single-currency `currency_rate` shared implementation,
// and the live probe never found a multi-currency response. Any failure
// (network error, an unexpected non-`code:1` shape, a future backend
// regression) makes the WHOLE tile hide rather than show partial rates —
// simplest failure mode for a small "3 numbers" tile, and matches the
// brief's "if unprobeable, FLAG + return null -> tile hides" contingency
// even though the live probe DID succeed.
export async function getRates() {
  if (USE_MOCK) {
    await delay()
    return { rates: RATES, source: 'NBG' }
  }
  try {
    const date = todayYMD()
    const dtos = await Promise.all(
      RATE_CURRENCIES.map(({ currency }) => http(`/mobileApi/currency/rate/?currency=${currency}&date=${date}`))
    )
    const rates = dtos.map((dto, i) => adaptRate(dto, RATE_CURRENCIES[i].pair))
    return { rates, source: 'NBG' }
  } catch {
    return null
  }
}

// Both error spellings the design doc flags (`CUSTOMER_HAS_NO_CRM_ID` from
// `dashboard/crm_finance/`'s doc example, `CUSTOMER_HAS_NO_CRMID` from the
// live `finance/tournover/` capture) are treated identically — see
// adaptContractsSummary's comment on why the live spelling is actually
// unreachable as a thrown ApiError (its code is positive) and is instead
// caught via the resulting empty `deals`.
const NO_CRM_ERRORS = new Set(['CUSTOMER_HAS_NO_CRM_ID', 'CUSTOMER_HAS_NO_CRMID'])

export async function getContractsSummary() {
  if (USE_MOCK) {
    await delay()
    return mockContractsSummary()
  }
  try {
    const [tournoverDto, scheduleDto] = await Promise.all([
      http('/mobileApi/finance/tournover/'),
      http('/mobileApi/finance/schedule/'),
    ])
    return adaptContractsSummary(tournoverDto, scheduleDto)
  } catch (err) {
    if (err instanceof ApiError && NO_CRM_ERRORS.has(err.errorCode)) {
      return { empty: true }
    }
    throw err
  }
}

export async function getUnpaidInvoices() {
  if (USE_MOCK) {
    await delay()
    return mockUnpaidInvoices()
  }
  const dto = await http('/mobileApi/payment/')
  return adaptUnpaidInvoices(dto)
}
