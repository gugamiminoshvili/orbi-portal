// Apartments mock data — lifted verbatim from reference/orbi-portal-redesign.html (lines 859-877)
export const APTS = [
  { id: 'A1', project: 'Orbi City', code: 'OCT.A.30.3026', block: 'A', number: '3026', name: 'OCT.A.30.3026', building: 'Orbi City, Block A', addr: 'Sherif Khimshiashvili St 5, Batumi', type: '1 Bedroom', area: 42, floor: 30, status: 'active', balance: -180.00, nextDue: 'Jun 25, 2026', rent: 1450, occupancy: 'Rented', seed: 0 },
  { id: 'A2', project: 'Orbi City', code: 'OCT.A.14.1408', block: 'A', number: '1408', name: 'OCT.A.14.1408', building: 'Orbi City, Block A', addr: 'Sherif Khimshiashvili St 5, Batumi', type: 'Studio', area: 31, floor: 14, status: 'active', balance: 0.00, nextDue: '-', rent: 1100, occupancy: 'Owner use', seed: 4 },
  { id: 'A3', project: 'Orbi City', code: 'OCT.B.21.2105', block: 'B', number: '2105', name: 'OCT.B.21.2105', building: 'Orbi City, Block B', addr: 'Sherif Khimshiashvili St 5, Batumi', type: '2 Bedroom', area: 58, floor: 21, status: 'active', balance: -95.00, nextDue: 'Jun 25, 2026', rent: 1600, occupancy: 'Rented', seed: 3 },
  { id: 'A4', project: 'Orbi Sea Towers', code: 'OST.A.08.0803', block: 'A', number: '0803', name: 'OST.A.08.0803', building: 'Orbi Sea Towers, Block A', addr: 'Khimshiashvili St 17, Batumi', type: '2 Bedroom', area: 60, floor: 8, status: 'paused', balance: 0.00, nextDue: 'Paused', rent: 0, occupancy: 'Under renovation', seed: 5 },
  { id: 'A5', project: 'Orbi Sea Towers', code: 'OST.A.17.1702', block: 'A', number: '1702', name: 'OST.A.17.1702', building: 'Orbi Sea Towers, Block A', addr: 'Khimshiashvili St 17, Batumi', type: '1 Bedroom', area: 45, floor: 17, status: 'active', balance: 320.00, nextDue: '-', rent: 1250, occupancy: 'Owner use', seed: 1 },
]

// Stable colour per block/project for the building icon tiles. Shades of the
// brand green #008E49 (owner palette, 2026-08-04) so each block reads as a
// different building without leaving the brand. Raw hex rather than tokens:
// these are gradient STOPS whose only job is to differ from each other, and
// they sit under white glyphs in both themes.
export const BLOCK_COLORS = {
  'Orbi City|A': ['#008E49', '#14A85C'],
  'Orbi City|B': ['#00693C', '#008E49'],
  'Orbi Sea Towers|A': ['#00794A', '#00A85C'],
  '_default': ['#3F7A5A', '#5A9B78'],
}
export function blockGrad(a) {
  const c = BLOCK_COLORS[a.project + '|' + a.block] || BLOCK_COLORS._default
  return `linear-gradient(135deg,${c[0]},${c[1]})`
}

// ownership roles + registry codes for each unit (all apartments are active)
const ROLES = { A1: 'Owner', A2: 'Owner', A3: 'Owner', A4: 'Trusted', A5: 'Trusted' }
export const ROLE_STYLE = {
  'Owner': { bg: 'var(--teal-soft)', col: 'var(--teal-ink)' },
  'Co-Owner': { bg: 'var(--info-bg)', col: 'var(--info-ink)' },
  'Trusted': { bg: '#ece7ff', col: '#6b4bff' },
}

APTS.forEach((a, i) => {
  a.cadastral = `05.3${a.block === 'B' ? '4' : '2'}.0${3 + i}.${(120 + i * 9)}.${(20 + i)}`
  a.waterCode = `WTR-${a.number}`
  a.apCode = `AP-${a.code.replace(/\./g, '')}`
  a.role = ROLES[a.id] || 'Owner'
})

export const STATUS_MAP = {
  active: { cls: 'pos', label: 'Active' },
  paused: { cls: 'warn', label: 'Paused' },
  paid: { cls: 'pos', label: 'Paid' },
  pending: { cls: 'warn', label: 'Pending' },
  overdue: { cls: 'neg', label: 'Overdue' },
}
