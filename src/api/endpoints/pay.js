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
