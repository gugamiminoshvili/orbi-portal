// Number-only money formatting (grouped thousands, 2 decimals) for layouts
// that render the currency symbol in its OWN element rather than inline —
// the dashboard debt card sets the symbol smaller/muted beside a large
// figure, which a single "637.12 $" string can't express.
export const fmtNum = (n) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })

// Owner call (2026-07-30): the symbol goes AFTER the amount everywhere.
// Joined with a non-breaking space so the symbol can never wrap onto its own
// line; test queries still see it as a plain space (Testing Library's default
// normalizer collapses \s+, which includes  ).
export const fmt = (n, cur = '₾') => `${fmtNum(n)} ${cur}`

// ISO currency code -> display symbol. Backend balances carry the code
// (`apartmentBalanceCurrency: "USD"`, `flatBalance.currency`), the UI wants
// the glyph. Unknown codes fall through as-is rather than being forced to a
// wrong symbol.
const SYMBOLS = { USD: '$', GEL: '₾', EUR: '€', GBP: '£' }
export const symbolFor = (code, fallback = '₾') => (code ? SYMBOLS[code] || code : fallback)

// `YYYY-MM-DD...` -> `DD/MM/YYYY`, date only. Read straight off the string
// rather than through Date: the backend sends zone-less timestamps
// ("2015-04-16T00:00:00") and parsing one would let a UTC-vs-local reading
// move the day. Anything that doesn't start with a date passes through, so
// the caller's own '—' fallback still applies to empty values.
export function fmtDate(value) {
  const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value
}
