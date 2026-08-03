// Real-mode tests for the internet-catalog modals: with USE_MOCK forced
// false (same vi.mock pattern as src/api/endpoints/*.real.test.js), the plan
// and boost catalogs must come from the getTariffs()/getAgreement()
// endpoints — never from the static mock PLANS/BOOSTS — so the ids the
// modals later POST are ids the real backend actually issued.
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

import { getAgreement, getTariffs, activateBoost, changePackage } from '../../../api/endpoints/apartments'
import ChangePackageModal from './ChangePackageModal'
import BoostModal from './BoostModal'

// Server-issued catalog — deliberately different names/ids from mock PLANS/
// BOOSTS so a test can't pass by accidentally rendering the static import.
// netId/tvId mirror the live combined-tariff shape (internet_id/tv_id) —
// the agreement's planId below is a NET tariff id, so current-plan matching
// must go through netId, not the plan's own id (Task L1).
const TARIFFS = {
  plans: [
    { id: 901, name: 'Server Plan A', price: 55, mbps: 60, ch: 40, netId: 11, tvId: 21 },
    { id: 902, name: 'Server Plan B', price: 85, mbps: 100, ch: 40, netId: 12, tvId: 22 },
  ],
  boosts: [
    { id: 801, name: 'Server Boost X', price: 12, speed: '+80 Mbps', duration: '-' },
  ],
}

const APT = {
  id: 501,
  objectId: 3026,
  code: 'OCT.A.30.3026',
  services: { internet: { planId: null, renewal: '-', boost: null } },
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
  // planId is the agreement's net_tariff.id — matches Server Plan B's netId
  getAgreement.mockReset().mockResolvedValue({ planId: 12, planName: 'Server Plan B', status: 'Active' })
})

describe('ChangePackageModal (real mode)', () => {
  test('loads the catalog from getTariffs + getAgreement and renders server plans, current plan marked', async () => {
    renderModal(<ChangePackageModal apartment={APT} />)

    expect(await screen.findByText('Server Plan A')).toBeInTheDocument()
    expect(screen.getByText('Server Plan B')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(1)
    expect(getAgreement).toHaveBeenCalledWith(3026) // flat id (objectId), not the property relation id
    // agreement's net-tariff planId (12) marks Server Plan B (netId 12) as current
    expect(screen.getByTestId('plan-card-902').textContent).toContain('Current plan')
    // and the static mock catalog is nowhere to be seen
    expect(screen.queryByText('Package 1')).not.toBeInTheDocument()
  })

  test('a rejected changePackage shows a toast and re-enables Confirm', async () => {
    changePackage.mockRejectedValueOnce(new Error('server down'))

    renderModal(<ChangePackageModal apartment={APT} />)

    const planACard = await screen.findByTestId('plan-card-901')
    fireEvent.click(within(planACard).getByRole('button', { name: 'Change' }))
    const confirmBtn = await screen.findByRole('button', { name: 'Confirm' })
    fireEvent.click(confirmBtn)

    expect(await screen.findByText(/Request failed/i)).toBeInTheDocument()
    // still on the confirm step, button usable again for a retry — not stuck
    expect(confirmBtn).not.toBeDisabled()
    expect(changePackage).toHaveBeenCalledTimes(1)
    // addressed by the backend flat id (objectId 3026, NOT the property
    // relation id 501), with the whole plan object (netId/tvId carrier)
    expect(changePackage).toHaveBeenCalledWith(3026, expect.objectContaining({ id: 901, netId: 11, tvId: 21 }))
  })

  test('a rejected getTariffs/getAgreement shows an error state with a working retry', async () => {
    getTariffs.mockReset().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(TARIFFS)

    renderModal(<ChangePackageModal apartment={APT} />)

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('Server Plan A')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Server Plan A')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(2)
  })
})

describe('BoostModal (real mode)', () => {
  test('loads the boost catalog from getTariffs and renders server boosts', async () => {
    renderModal(<BoostModal apartment={APT} />)

    expect(await screen.findByText('Server Boost X')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Boost 65')).not.toBeInTheDocument()
  })

  test('a rejected activateBoost shows a toast and re-enables the Activate button', async () => {
    activateBoost.mockRejectedValueOnce(new Error('server down'))

    renderModal(<BoostModal apartment={APT} />)

    fireEvent.click(await screen.findByText('Server Boost X'))
    fireEvent.click(screen.getByRole('button', { name: /Activate/ }))
    const chargeBtn = await screen.findByRole('button', { name: /Charge & activate/ })
    fireEvent.click(chargeBtn)

    expect(await screen.findByText(/Request failed/i)).toBeInTheDocument()
    // still on the confirm step, button usable again for a retry — not stuck
    expect(chargeBtn).not.toBeDisabled()
    expect(activateBoost).toHaveBeenCalledTimes(1)
    // addressed by the backend flat id (objectId), not the property relation id
    expect(activateBoost).toHaveBeenCalledWith(3026, 801)
  })

  test('a rejected getTariffs shows an error state with a retry that reloads the catalog', async () => {
    getTariffs.mockReset().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(TARIFFS)

    renderModal(<BoostModal apartment={APT} />)

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('Server Boost X')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Server Boost X')).toBeInTheDocument()
    expect(getTariffs).toHaveBeenCalledTimes(2)
  })
})
