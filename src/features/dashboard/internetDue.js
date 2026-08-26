// Internet is prepaid, so its balance is normally an advance rather than a
// debt. It only becomes payable when the current balance is about to run out
// — under 14 days left (owner rule 2026-08-07) — and what falls due then is
// the package tariff, plus any penalty already charged.
const INTERNET_DUE_DAYS = 14

// Sum of what internet actually owes right now, across the portfolio.
export function internetDue(apartments = []) {
  let total = 0
  for (const apt of apartments) {
    const net = apt?.services?.internet
    if (!net || !net.planId) continue
    if (net.daysLeft >= INTERNET_DUE_DAYS) continue
    total += Number(net.tariff || 0) + Number(net.penalty || 0)
  }
  return total
}

