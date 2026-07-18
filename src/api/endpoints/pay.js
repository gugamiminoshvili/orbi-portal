import { USE_MOCK, delay, http } from '../client'

// NOTE: v1's single-apartment `payService` (POST /mobileApi/payment/, Task
// I7) was removed with PayPage in Task P3-3 — the multi-pay flow's payMulti
// (POST /mobileApi/payment/multi/, below) is its replacement, and no call
// site referenced payService anymore. See git history if the single-payment
// endpoint ever needs reviving.

// `services` is the multi-pay flow's selected-apartment list, one entry per
// apartment: `[{epcode, amount, serviceType}]` (per-apartment amount/service
// the summary panel already computed; nothing here re-derives it). `method`
// picks which of the doc's optional boolean flags/`vendor` value the POST
// body carries — the mapping itself is ASSUMED (spec's payment/multi mapping
// table, backend-Q #1 still open) since the doc only enumerates the flag
// NAMES (`vendor`, `as_invoice`, `open_banking`, `direct_card`, `crypto`),
// not which method maps to which combination:
//  - 'card'    -> direct_card:true
//  - 'applepay'-> direct_card:true, vendor:'applepay'
//  - 'bank'    -> open_banking:true, vendor:<bankVendor> (a bank key like
//                 'bog'/'tbc'/'credo'/'liberty' — also ASSUMED, backend-Q #1)
//  - 'crypto'  -> crypto:true
//  - 'invoice' -> as_invoice:true (the response is then invoice data, not a
//                 redirect url — the caller passes it to downloadInvoice)
// Response shape is passed through UN-adapted: the doc only says "normally
// payment URL/invoice data" with no field names, so `{url}` (redirect
// methods) or whatever invoice-data shape `as_invoice` returns both flow
// straight to the caller (which opens `url` in a new tab, the same pattern
// v1's redirect-based payService used).
function multiPayFlags(method, bankVendor) {
  switch (method) {
    case 'card':
      return { direct_card: true }
    case 'applepay':
      return { direct_card: true, vendor: 'applepay' }
    case 'bank':
      return { open_banking: true, vendor: bankVendor }
    case 'crypto':
      return { crypto: true }
    case 'invoice':
      return { as_invoice: true }
    default:
      return {}
  }
}

export async function payMulti({ services, method, bankVendor, lang } = {}) {
  if (USE_MOCK) {
    await delay()
    return { url: 'https://example.test/pay' }
  }
  const body = { services, ...multiPayFlags(method, bankVendor) }
  if (lang) body.language = lang
  return http('/mobileApi/payment/multi/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// `response_type` is a REQUIRED query param the doc names but never
// enumerates a value for (backend-Q #4) — FLAG: 'pdf' is assumed, by analogy
// with `/finance/`'s `response_format=pdf` (locks.js's
// downloadElectricityReport). Real-mode-only: mock mode's invoice download
// never round-trips through here (PayPage's mock wizard has no PDF concept),
// so the mock branch just returns a small placeholder Blob for callers that
// exercise it anyway.
export async function downloadInvoice(invoiceId) {
  if (USE_MOCK) {
    await delay()
    return new Blob(['mock invoice'], { type: 'application/pdf' })
  }
  const params = new URLSearchParams({ invoice_id: String(invoiceId), response_type: 'pdf' })
  return http(`/mobileApi/payment/invoice/?${params.toString()}`, { blob: true })
}
