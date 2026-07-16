// Real-mode tests for the internet-catalog modals: with USE_MOCK forced
// false (same vi.mock pattern as src/api/endpoints/*.real.test.js), the plan
// and boost catalogs must come from the getTariffs()/getAgreement()
// endpoints — never from the static mock PLANS/BOOSTS — so the ids the
// modals later POST are ids the real backend actually issued.
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../../../i18n'
import { ToastProvider } from '../../../context/ToastContext'
import { ModalProvider } from '../../../context/ModalContext'

vi.mock('../../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn(), httpMultipart: vi.fn() }
})

vi.mock('../../../api/endpoints/apartments', () => ({
  changePackage: vi.fn(),
  activateBoost: vi.fn(),
  getAgreement: vi.fn(),
  getTariffs: vi.fn(),
}))

import { getAgreement, getTariffs } from '../../../api/endpoints/apartments'
import ChangePackageModal from './ChangePackageModal'
import BoostModal from './BoostModal'

// Server-issued catalog — deliberately different names/ids from mock PLANS/
// BOOSTS so a test can't pass by accidentally rendering the static import.
const TARIFFS = {
  plans: [
    { id: 901, name: 'Server Plan A', price: 55, mbps: 60, ch: 40 },
    { id: 902, name: 'Server Plan B', price: 85, mbps: 100, ch: 40 },
  ],
  boosts: [
    { id: 801, name: 'Server Boost X', price: 12, speed: '+80 Mbps', duration: '24 hours' },
  ],
}

const APT = {
  id: 501,
  objectId: 3026,
  code: 'OCT.A.30.3026',
  services: { internet: { planId: null, renewal: '—', boost: null } },
}

function renderModal(node) {
  return render(
    <ToastProvider>
      <ModalProvider>{node}</ModalProvider>
    </ToastProvider>
  )
}

beforeEach(() => {
  getTariffs.mockReset().mockResolvedValue(TARIFFS)
  getAgreement.mockReset().mockResolvedValue({ planId: 902, provider: 'Silknet', status: 'Active' })
})

describe('ChangePackageModal (real mode)', () => {
  test('loads the catalog from getTariffs + getAgreement and renders server plans, current plan marked', async () => {
    renderModal(<ChangePackageModal apartment={APT} />)

    expect(await screen.findByText('Server Plan A')).toBeInTheDocument()
    expect(screen.getByText('Server Plan B')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(1)
    expect(getAgreement).toHaveBeenCalledWith(3026) // flat id (objectId), not the property relation id
    // agreement's planId (902) marks Server Plan B as the current plan
    expect(screen.getByTestId('plan-card-902').textContent).toContain('Current plan')
    // and the static mock catalog is nowhere to be seen
    expect(screen.queryByText('Package 1')).not.toBeInTheDocument()
  })
})

describe('BoostModal (real mode)', () => {
  test('loads the boost catalog from getTariffs and renders server boosts', async () => {
    renderModal(<BoostModal apartment={APT} />)

    expect(await screen.findByText('Server Boost X')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Boost 65')).not.toBeInTheDocument()
  })
})
