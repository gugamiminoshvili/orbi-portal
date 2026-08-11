// THE SIGN CONVENTION, in one place.
//
// Owner ruling 2026-08-06, closing the question raised as README §17:
//
//   balance > 0  ->  the resident OWES this much
//   balance < 0  ->  the resident has paid AHEAD (an advance, good news)
//   balance = 0  ->  settled
//
// This holds for every service — maintenance, electricity, internet/TV — with
// no exceptions. Until this ruling the app assumed the opposite (negative =
// owed), which is why the backend's own field names read inverted: on
// `flatBalance`, `debt_sum` is the sum of the NEGATIVE balances (i.e. the
// advances) and `balance_sum` is the sum of the POSITIVE ones (the debt).
// See adaptCommunals.
//
// Nothing outside this module should compare a balance against 0. Route it
// through these four helpers so the convention can never be half-applied —
// a colour that disagrees with a Pay button is worse than either being
// wrong on its own.

function num(balance) {
  const n = Number(balance)
  return Number.isNaN(n) ? 0 : n
}

// True when there is something to pay. Zero is not owing.
export function owes(balance) {
  return num(balance) > 0
}

// True when the resident is ahead. Zero is not an advance either.
export function inAdvance(balance) {
  return num(balance) < 0
}

// What a Pay button should charge: the balance itself when owed, else 0.
// Never negative, so a credit can't be "paid".
export function amountOwed(balance) {
  return owes(balance) ? num(balance) : 0
}

// The semantic tone for a balance figure — 'neg' (red, owed) or 'pos'
// (green, settled or in advance). Returns the token/class NAME rather than a
// colour so both the global tokens (--neg-ink/--pos-ink) and the CSS-module
// classes (styles.neg/styles.pos) can key off the same call.
export function balanceTone(balance) {
  return owes(balance) ? 'neg' : 'pos'
}
