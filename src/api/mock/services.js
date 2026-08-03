// Per-apartment services mock data — lifted verbatim from reference/orbi-portal-redesign.html (lines 879-905)
import { planById } from './plans'

export const SERVICES = {
  A1: { maintenance: { balance: -120, tariff: 120, start: '12 Jan 2022' }, water: { counter: 'W-3026-01', indication: '00428 m³', updated: '5 Jun 2026' }, electricity: { counter: 'E-3026-01', status: 'Active', balance: -60, updated: '5 Jun 2026' }, internet: { provider: 'Magti', plan: 'Fiber 200 Mbps + TV', balance: 0, status: 'Active', updated: '1 Jun 2026' } },
  A2: { maintenance: { balance: 0, tariff: 95, start: '03 Mar 2023' }, water: { counter: 'W-1408-01', indication: '00211 m³', updated: '5 Jun 2026' }, electricity: { counter: 'E-1408-01', status: 'Active', balance: 0, updated: '5 Jun 2026' }, internet: { provider: 'Silknet', plan: 'Fiber 100 Mbps + TV', balance: 0, status: 'Active', updated: '1 Jun 2026' } },
  A3: { maintenance: { balance: -95, tariff: 95, start: '21 Sep 2021' }, water: { counter: 'W-2105-01', indication: '00540 m³', updated: '5 Jun 2026' }, electricity: { counter: 'E-2105-01', status: 'Active', balance: 0, updated: '5 Jun 2026' }, internet: { provider: 'Magti', plan: 'Fiber 200 Mbps + TV', balance: 0, status: 'Active', updated: '1 Jun 2026' } },
  A4: { maintenance: { balance: 0, tariff: 140, start: '08 Feb 2020' }, water: { counter: 'W-0803-01', indication: '00690 m³', updated: '2 Apr 2026' }, electricity: { counter: 'E-0803-01', status: 'Suspended', balance: 0, updated: '2 Apr 2026' }, internet: { provider: '-', plan: 'No active plan', balance: 0, status: 'Inactive', updated: '-' } },
  A5: { maintenance: { balance: 0, tariff: 90, start: '17 Jul 2024' }, water: { counter: 'W-1702-01', indication: '00150 m³', updated: '5 Jun 2026' }, electricity: { counter: 'E-1702-01', status: 'Active', balance: 0, updated: '5 Jun 2026' }, internet: { provider: 'Silknet', plan: 'Fiber 100 Mbps', balance: 0, status: 'Active', updated: '1 Jun 2026' } },
}

// enrich each unit's internet service with subscription details
const NET_PLAN = { A1: 'P2', A2: 'P2', A3: 'P3', A5: 'P1' }
Object.keys(SERVICES).forEach((id) => {
  const n = SERVICES[id].internet
  const pid = NET_PLAN[id]
  n.planId = pid || null
  n.tariff = pid ? planById(pid).price : 0
  n.renewal = pid ? '19 Jul 2026' : '-'
  n.daysLeft = pid ? 40 : 0
  n.cycleDays = 60
  n.boost = null
  n.status = pid ? (n.status || 'Active') : 'Inactive'
})
