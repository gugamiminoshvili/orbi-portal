// Opens a hosted-checkout url in a new tab with window.opener severed.
// Extracted from v1 PayPage's handleRealPay (Task I7 real-mode redirect
// flow; PayPage itself was retired in P3-3 — see git history for the
// original inline copy) so the multi-pay method modal (P3-4) can reuse the
// exact same popup-block-safe open pattern for all four redirect methods
// (card/applepay/bank/crypto) instead of duplicating it.
//
// Deliberately NOT window.open(url, '_blank', 'noopener'): the 'noopener'
// feature makes window.open return null by spec even when the tab opens
// fine, which would be indistinguishable from a popup-blocked open — so this
// opens plain '_blank', nulls out win.opener on the returned handle (same
// isolation), and lets null mean "blocked" (the caller shows a Reopen
// button instead of claiming a tab opened).
export function openPaymentTab(url) {
  const win = window.open(url, '_blank')
  if (win) win.opener = null
  return Boolean(win)
}
