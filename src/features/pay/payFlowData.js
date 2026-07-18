// Pure data-shaping helpers for the multi-payment flow (MultiPayFlow +
// ComplexStep/UtilityStep/ApartmentsStep). Kept side-effect-free and
// React-free so the complex/utility grouping and owed-amount math can be
// unit tested without rendering anything (see payFlowData.test.js).
//
// Sign convention (CRITICAL — see adaptCommunals/adaptProperty comments in
// api/adapters/dashboard.js and apartments.js): a NEGATIVE balance means the
// apartment OWES that amount; a positive (or zero) balance is a credit.
// Every screen in this flow needs the opposite framing — "how much does the
// resident need to pay" — so `owedFor` returns `-balance`:
//   - balance -50 (owed 50)  -> owed  50 (positive, selectable, shown red)
//   - balance +30 (credit)   -> owed -30 (negative, disabled, shown "-30.00")
//   - balance 0              -> owed   0 (disabled, shown "0.00")
// This single sign flip is what makes the credit/zero rows in the step-3
// table naturally render with a leading minus via utils/format.js's fmt()
// (fmt(n) prepends '-' only when n<0) without any extra per-row branching.
export const UTILITIES = ['maintenance', 'electricity', 'internettv']

// LIVE maintenance arrives in USD (flatBalance.apartmentBalance, per
// adaptCommunals — flatBalance.currency 'USD'), while electricity/internettv
// are already GEL. The design screenshots show maintenance converted to GEL
// with a "$1 = X₾" rate line in the summary panel — FLAG: converting here
// (rather than leaving maintenance in USD) is an assumption; no live sample
// of the multi-pay screens confirms the backend expects GEL amounts in the
// eventual POST /payment/multi/ body.
//
// The conversion is CONDITIONAL on `maintenanceCurrency` (callers thread
// communals.maintenance.currency through): mock-mode maintenance balances
// are authored in GEL — the same SERVICES numbers the apartment detail page
// renders with ₾, and mockCommunals reports currency 'GEL' — so multiplying
// them by the rate would double-convert (detail page "Pay ₾120.00" vs a
// flow default of ₾316). Only a genuinely-USD figure (live currency 'USD')
// is multiplied by the USD/GEL rate. When the rate is unavailable (getRates
// failed) a USD figure falls back to its raw magnitude rather than blocking
// the whole flow — FLAG, untested against a real "rate missing" scenario.
export function owedFor(row, utility, usdRate, maintenanceCurrency = 'USD') {
  if (utility === 'maintenance') {
    const owed = -row.maintenance
    if (maintenanceCurrency === 'USD' && usdRate != null) return owed * usdRate
    return owed
  }
  if (utility === 'electricity') return -row.electricity
  // internettv: `balanceWithPenalty` (live `balance_with_penalty`, captured
  // by adaptCommunals) is the collectable amount — base balance plus any
  // late penalty; falls back to the plain balance for rows shaped before
  // the field existed.
  return -(row.internet.balanceWithPenalty ?? row.internet.balance)
}

// Joins communals' per-apartment detail (keyed by apartment `code`) to
// listApartments()'s `project`/`role` so the flow can group by complex —
// mirrors the join the brief describes (byApartment.code <-> apartments.code).
// A byApartment row with no matching apartment (shouldn't happen live, but
// defensive) gets project '—' rather than being dropped, so its debt isn't
// silently lost from the totals.
export function buildRows(byApartment, apartments) {
  const aptByCode = new Map(apartments.map((a) => [a.code, a]))
  return byApartment.map((row) => {
    const apt = aptByCode.get(row.code)
    return { ...row, project: apt?.project ?? '—', role: apt?.role ?? null, aptId: apt?.id ?? null }
  })
}

// Groups joined rows by complex (project), computing the step-1 card's
// three numbers: apartment count, unpaid BILLS count (one apartment can
// contribute up to 3 — one per utility, matching step 2's per-utility
// counts), and the GEL outstanding total (maintenance already converted by
// owedFor). Only positive owed amounts count toward either number — credits
// don't offset other apartments' debts here (each apartment/utility pair is
// its own bill).
export function buildComplexes(rows, usdRate, maintenanceCurrency = 'USD') {
  const byProject = new Map()
  for (const row of rows) {
    if (!byProject.has(row.project)) byProject.set(row.project, [])
    byProject.get(row.project).push(row)
  }
  return Array.from(byProject.entries()).map(([project, projectRows]) => {
    let unpaidBillsCount = 0
    let outstandingGEL = 0
    for (const row of projectRows) {
      for (const utility of UTILITIES) {
        const owed = owedFor(row, utility, usdRate, maintenanceCurrency)
        if (owed > 0) {
          unpaidBillsCount += 1
          outstandingGEL += owed
        }
      }
    }
    return { project, apartments: projectRows, count: projectRows.length, unpaidBillsCount, outstandingGEL }
  })
}

// Step 2's three utility cards: how many apartments (within the already-
// selected complex) currently owe something for each utility type.
export function utilityCardData(complexApartments, usdRate, maintenanceCurrency = 'USD') {
  return UTILITIES.map((utility) => ({
    utility,
    unpaidCount: complexApartments.filter((row) => owedFor(row, utility, usdRate, maintenanceCurrency) > 0).length,
  }))
}

// Rounds to cents — used whenever an owed amount becomes an editable
// payment amount (default checkbox-select value), so the input never shows
// a long floating-point tail from the USD->GEL multiply.
export function round2(n) {
  return Math.round(n * 100) / 100
}
