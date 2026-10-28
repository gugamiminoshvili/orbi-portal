// GET /persCabApi/paymentMethods/ -> the method modal's rows.
//   live: { id, name, key, title, max_payable, fee_percent, max_fee_amount }
//   app:  { id, key, name, title, max, feePct, maxFee }
// A missing limit or fee stays null (no limit / no fee) rather than 0, which
// would read as "nothing can be paid" or "free".
const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

export function adaptPaymentMethods(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => r && r.id != null && r.key)
    .map((r) => ({
      id: r.id,
      key: String(r.key).toLowerCase(),
      name: r.name ?? '',
      title: r.title ?? r.name ?? '',
      max: num(r.max_payable),
      feePct: num(r.fee_percent),
      maxFee: num(r.max_fee_amount),
    }))
}
