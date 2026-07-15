import { USE_MOCK, delay, http } from '../client'
import { APTS } from '../mock/apartments'
import { SERVICES } from '../mock/services'

function genRef() {
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${digits}`
}

export async function payService(aptId, { amount, method }) {
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
  return http(`/apartments/${aptId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount, method }),
  })
}
