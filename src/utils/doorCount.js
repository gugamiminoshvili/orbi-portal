export function doorCount(aptId, y, m, d) {
  const seed = (aptId.charCodeAt(1) * 31 + y * 7 + (m + 1) * 13 + d * 17) % 23
  return seed < 6 ? 0 : Math.max(0, seed - 5)
}

export function monthTotal(aptId, y, m) {
  let t = 0, days = new Date(y, m + 1, 0).getDate()
  for (let d = 1; d <= days; d++) t += doorCount(aptId, y, m, d)
  return t
}

export function yearTotal(aptId, y) {
  let t = 0
  for (let m = 0; m < 12; m++) t += monthTotal(aptId, y, m)
  return t
}
