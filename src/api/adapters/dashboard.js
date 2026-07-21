// DTO adapters for the Phase 3 dashboard + multi-payment data layer:
// `/mobileApi/dashboard/communals/`, `/mobileApi/currency/rate/`,
// `/mobileApi/finance/tournover/` + `/mobileApi/finance/schedule/`, and
// `/mobileApi/payment/` (unpaid invoices). See docs/specs/
// 2026-07-17-dashboard-multipay-design.md and Task P3-1's ground-truth
// capture (scratchpad/sdd/live-dashboard-payloads.json) for the shapes
// these are aligned to.

function num(value) {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

// `/dashboard/communals/`'s live result is `{communal, flatBalance}`:
//  - `communal` carries the GEL-denominated electricity/water/internettv
//    detail, keyed by apartment CODE (e.g. "OCT.A.15.1519"), plus two
//    already-aggregated top-level sums: `electricityBalance_sum` and
//    `internet_debt_sum`.
//  - `flatBalance` carries the USD-denominated per-apartment maintenance
//    balance (`apartmentBalance`), plus its own aggregated `balance_sum`/
//    `debt_sum`.
// Both pairs of sums are read straight off the top level rather than
// recomputed from the per-apartment detail: the live sample confirms they
// are NOT a plain sum of every apartment (electricityBalance_sum 71.38 only
// equals the sum of the two POSITIVE per-apartment balances, 42.62+28.76 —
// the two negative/debt ones are excluded; flatBalance.balance_sum/debt_sum
// show the identical positive/negative split). Trusting the backend's own
// aggregate sidesteps having to guess that split rule for the tile totals;
// the per-apartment detail is only needed for `byApartment` (the multi-pay
// flow's apartment list), not for re-deriving the sums.
export function adaptCommunals(dto = {}) {
  const communal = dto.communal || {}
  const detailed = communal.detailed || {}
  const electricityDetail = detailed.electricity || {}
  const waterDetail = detailed.water || {}
  const internetDetail = detailed.internettv || {}
  const flatBalance = dto.flatBalance || {}
  const flatDetail = flatBalance.detailed || {}

  // Union of every apartment code across all four detail maps — a code
  // needn't appear in all of them (the live sample's internettv detail only
  // has ONE of the four apartments, since only one has an active plan).
  const codes = new Set([
    ...Object.keys(electricityDetail),
    ...Object.keys(waterDetail),
    ...Object.keys(internetDetail),
    ...Object.keys(flatDetail),
  ])

  const byApartment = Array.from(codes).map((code) => {
    const elec = electricityDetail[code] || {}
    const water = waterDetail[code] || {}
    const net = internetDetail[code] || {}
    const flat = flatDetail[code] || {}
    const displayServices =
      elec.display_services || water.display_services || net.display_services || flat.display_services || []
    return {
      code,
      epcode: elec.epcode ?? water.epcode ?? net.epcode ?? flat.epcode ?? '—',
      electricity: num(elec.electricityBalanceGEL),
      waterIndication: water.indication ?? '—',
      internet: {
        balance: num(net.balance),
        // Live internettv detail carries `balance_with_penalty` alongside
        // the base `balance` — the collectable amount once late penalties
        // are included. This is what the multi-pay flow's owedFor() charges
        // for internettv; fall back to the base balance if the field is
        // ever absent.
        balanceWithPenalty: num(net.balance_with_penalty ?? net.balance),
        cost: num(net.cost),
        penalty: num(net.penalty),
      },
      maintenance: num(flat.apartmentBalance),
      displayServices,
    }
  })

  return {
    utilities: {
      electricitySum: num(communal.electricityBalance_sum),
      internetSum: num(communal.internet_debt_sum),
      currency: communal.currency || 'GEL',
    },
    maintenance: {
      sum: num(flatBalance.balance_sum),
      debtSum: num(flatBalance.debt_sum),
      currency: flatBalance.currency || 'USD',
    },
    byApartment,
  }
}

// `/currency/rate/`'s param format was probed live (Task P3-1 — never
// printed credentials; see the report). `?currency=<CODE>&date=YYYY-MM-DD`
// (today's date) is the only combination that returned `code:1`: bare, a
// bare `date=`, and `currency=` alone all answered `-1 "date is not valid"`;
// `date=DD-MM-YYYY` also failed. The pair label is assembled by the endpoint
// layer, not read from the DTO. (RUB was dropped at owner request 2026-07-21;
// only USD and EUR remain.)
export function adaptRate(dto = {}, pair) {
  return { pair, rate: num(dto.rate), delta: num(dto.changes) }
}

// `/finance/tournover/` and `/finance/schedule/`, combined into one
// "Contracts" tile summary. The live capture (crm-less test account) shows
// tournover answering `code:1` (NOT a thrown ApiError) with `result:[]` and
// a same-envelope `error:"CUSTOMER_HAS_NO_CRMID"` — parseEnvelope only ever
// returns `.result` on a non-negative code, so that `error` string is
// unreachable from here; the empty array it leaves behind is what this
// function actually keys off (`deals` missing/empty -> `{empty:true}`).
// `dashboard/crm_finance/`'s doc example uses the OTHER spelling,
// `CUSTOMER_HAS_NO_CRM_ID` (with a negative code, which DOES throw an
// ApiError) — the endpoint layer's catch handles that spelling too, in case
// tournover ever answers with a negative code instead of the live sample's
// positive one. Either way the Contracts tile renders the same graceful
// zero-state, so no UI-visible distinction is lost.
export function adaptContractsSummary(tournoverDto, scheduleDto) {
  const dealsObj = tournoverDto && !Array.isArray(tournoverDto) ? tournoverDto.deals : null
  const deals =
    dealsObj && typeof dealsObj === 'object'
      ? Object.entries(dealsObj).map(([id, d]) => ({
          id,
          total: num(d.total),
          paid: num(d.paid),
          remain: num(d.remain),
          status: d.status ?? '—',
          overdue: num(d.overdue),
          paidPercentage: num(d.paid_percentage),
        }))
      : []
  if (deals.length === 0) return { empty: true }
  const schedule = Array.isArray(scheduleDto?.schedule) ? scheduleDto.schedule.map(adaptScheduleItem) : []
  return { empty: false, deals, schedule }
}

// `/finance/schedule/`'s doc-enumerated fields, read verbatim (SCREAMING_CASE
// on the wire, camelCased here to match every other adapter's output style).
function adaptScheduleItem(item = {}) {
  return {
    id: item.id,
    dealId: item.UF_DEAL_ID ?? null,
    dueDate: item.DATE_PAY_BEFORE ?? '—',
    invoiceSum: num(item.INVOICE_SUM),
    paidSum: num(item.PAID_SUM),
    debts: num(item.DEBTS),
    statusId: item.STATUS_ID ?? null,
  }
}

// GET `/payment/`'s live shape (CustomerInvoiceSerializer, doc-elided beyond
// the name) — read verbatim off the ground-truth capture:
// `{id,created_at,debtAmount,epcode,service,flat,...}`. Adapted into a
// `{count, invoices}` wrapper for the dashboard's "unpaid invoices" tile.
export function adaptUnpaidInvoices(dto = []) {
  const list = Array.isArray(dto) ? dto : dto.result || []
  const invoices = list.map((inv) => ({
    id: inv.id,
    epcode: inv.epcode ?? '—',
    debtAmount: num(inv.debtAmount),
    service: inv.service ?? null,
    flat: inv.flat ?? null,
    createdAt: inv.created_at ?? '—',
  }))
  return { count: invoices.length, invoices }
}
