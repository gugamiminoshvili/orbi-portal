// Internet & TV plans + boosts — lifted verbatim from reference/orbi-portal-redesign.html (lines 889-899)
export const PLANS = [
  { id: 'P1', name: 'Package 1', price: 50, mbps: 50, ch: 35 },
  { id: 'P2', name: 'Package 2', price: 70, mbps: 75, ch: 35 },
  { id: 'P3', name: 'Package 3', price: 110, mbps: 120, ch: 35 },
  { id: 'P4', name: 'Package 4', price: 150, mbps: 150, ch: 35 },
]

export const BOOSTS = [
  { id: 'b65', name: 'Boost 65', price: 10, speed: '+65 Mbps', duration: '24 hours' },
  { id: 'b150', name: 'Boost+ 150', price: 25, speed: '+150 Mbps', duration: '7 days' },
]

export const planById = (id) => PLANS.find((p) => p.id === id)
