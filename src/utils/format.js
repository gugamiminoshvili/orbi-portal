// Number-only money formatting (grouped thousands, 2 decimals) for layouts
// that render the currency symbol in its OWN element rather than inline —
// the dashboard debt card sets the symbol smaller/muted beside a large
// figure, which a single "$637.12" string can't express.
export const fmtNum = (n) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })

export const fmt = (n, cur = '₾') => (n < 0 ? '-' : '') + cur + fmtNum(Math.abs(n))
