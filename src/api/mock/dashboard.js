// Mock dashboard + multi-payment data — derived from the existing mock
// APTS/SERVICES so mock-mode dashboard numbers stay consistent with every
// other mock-mode screen (apartment cards, service accordions, PayPage),
// rather than being a separate hand-authored dataset that could drift.
import { APTS } from './apartments'
import { SERVICES } from './services'

// Static NBG rate snapshot — pinned to the exact values Task P3-1's live
// `/currency/rate/?currency=<CODE>&date=<today>` probe returned (see
// adapters/dashboard.js's adaptRate comment), so mock and real mode show the
// same numbers rather than an arbitrary placeholder. RUB's rate is
// "per 100 RUB" (its live `quantity` was 100), hence the '100RUB/GEL' pair
// label.
export const RATES = [
  { pair: 'USD/GEL', rate: 2.6333, delta: -0.0011 },
  { pair: 'EUR/GEL', rate: 3.0191, delta: 0.0119 },
  { pair: '100RUB/GEL', rate: 3.3776, delta: -0.004 },
]

function sumPositive(nums) {
  return nums.reduce((sum, n) => sum + Math.max(n, 0), 0)
}
function sumNegative(nums) {
  return nums.reduce((sum, n) => sum + Math.min(n, 0), 0)
}

// Mirrors adaptCommunals' `byApartment` shape exactly, one entry per mock
// apartment. `epcode` has no mock equivalent (mock apartments carry no real
// epcode field) — `apCode` is reused, the same live-epcode stand-in
// apartments.js's `adaptFlatDetail` already documents (`apCode: dto.epcode
// || '—'`), so this is consistent with the existing mock/live correspondence
// rather than a new guess. `internet.penalty` has no mock concept and is
// always 0.
function buildByApartment() {
  return APTS.map((a) => {
    const s = SERVICES[a.id]
    return {
      code: a.code,
      epcode: a.apCode,
      electricity: s.electricity.balance,
      waterIndication: s.water.indication,
      internet: { balance: s.internet.balance, cost: s.internet.tariff, penalty: 0 },
      maintenance: s.maintenance.balance,
      displayServices: ['water', 'maintenance', 'electricity', 'orbinet', 'doors'],
    }
  })
}

// Live `communal.electricityBalance_sum`/`flatBalance.balance_sum`+`debt_sum`
// are each a positive/negative split of the per-apartment detail (see
// adaptCommunals' comment) — this mirrors that same split so mock totals
// follow the identical rule real mode's aggregates do. `internetSum` has no
// comparable split to infer from the single live internettv sample (its one
// entry's `cost`/`balance` don't disambiguate a rule) — FLAG: summing every
// apartment's internet cost outright is a reasonable stand-in for "amount
// owed for internet/TV" until a richer live sample confirms otherwise.
export function mockCommunals() {
  const byApartment = buildByApartment()
  return {
    utilities: {
      electricitySum: sumPositive(byApartment.map((a) => a.electricity)),
      internetSum: byApartment.reduce((sum, a) => sum + a.internet.cost, 0),
      currency: 'GEL',
    },
    maintenance: {
      sum: sumPositive(byApartment.map((a) => a.maintenance)),
      debtSum: sumNegative(byApartment.map((a) => a.maintenance)),
      currency: 'USD',
    },
    byApartment,
  }
}

// The mock account, like the live ground-truth account, has no CRM id — the
// Contracts tile's graceful zero-state applies in mock mode too (see
// adaptContractsSummary).
export function mockContractsSummary() {
  return { empty: true }
}

// One unpaid-invoice-shaped row per mock apartment service with a negative
// (owed) balance — the closest mock analog to the live `/payment/` list
// (CustomerInvoiceSerializer rows keyed by epcode/service/flat).
export function mockUnpaidInvoices() {
  const invoices = []
  let id = 1000
  for (const a of APTS) {
    const s = SERVICES[a.id]
    if (s.maintenance.balance < 0) {
      invoices.push({
        id: id++,
        epcode: a.apCode,
        debtAmount: -s.maintenance.balance,
        service: 'maintenance',
        flat: a.id,
        createdAt: '—',
      })
    }
    if (s.electricity.balance < 0) {
      invoices.push({
        id: id++,
        epcode: a.apCode,
        debtAmount: -s.electricity.balance,
        service: 'electricity',
        flat: a.id,
        createdAt: '—',
      })
    }
  }
  return { count: invoices.length, invoices }
}
