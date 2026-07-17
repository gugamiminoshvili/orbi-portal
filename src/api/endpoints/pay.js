import { USE_MOCK, delay, http } from '../client'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'

function genRef() {
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${digits}`
}

// `method` (visa/mc/bank) is still accepted from PayPage's mock-mode call —
// mock mode never actually reads it (the mock wizard has no server concept
// of payment method) — but real mode (Task I7) drops it entirely: the
// redirect flow has no Method step, so only `epcode`/`lang` are used there.
export async function payService(aptId, { amount, epcode, lang }) {
  if (USE_MOCK) {
    await delay()
    const apt = APTS.find((a) => a.id === aptId)
    const { maintenance, electricity } = SERVICES[aptId]
    let remaining = amount

    if (maintenance.balance < 0 && remaining > 0) {
      const applied = Math.min(remaining, -maintenance.balance)
      maintenance.balance += applied
      remaining -= applied
    }
    if (electricity.balance < 0 && remaining > 0) {
      const applied = Math.min(remaining, -electricity.balance)
      electricity.balance += applied
      remaining -= applied
    }
    apt.balance = maintenance.balance + electricity.balance

    return { ref: genRef(), amount }
  }
  // Real mode is redirect-based (Task I7): POST /mobileApi/payment/ returns a
  // hosted payment-provider url instead of a synchronous receipt — the
  // caller (PayPage) opens it in a new tab rather than rendering the mock's
  // Method/Confirm/Success wizard. `serviceType` is hardcoded to 'apartment'
  // since v1 only ever pays the apartment's combined account — the doc
  // doesn't enumerate the full serviceType list (backend-Q: confirm the
  // other values before wiring standalone electricity/internet payments
  // through this same endpoint).
  const result = await http('/mobileApi/payment/', {
    method: 'POST',
    body: JSON.stringify({ epcode, amount, serviceType: 'apartment', lang }),
  })
  return { url: result.url }
}

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
// straight to the caller (PayPage's existing open-in-new-tab pattern for the
// `url` case — see payService above).
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
