// Real-mode failure-handling tests for the remaining Task 13 modals/cards:
// PauseModal, InternetCard's Resume action, ElectricityReportModal, and
// DoorsCalendarModal — same vi.mock pattern as modals.real.test.jsx. Each
// covers a rejected mutation/fetch that, before this fix, would either leave
// an unhandled rejection + a permanently disabled/loading UI, or (Resume)
// had no busy state to restore at all.
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '../../../i18n'
import { ToastProvider } from '../../../context/ToastContext'
import { ModalProvider } from '../../../context/ModalContext'

vi.mock('../../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn(), httpMultipart: vi.fn() }
})

vi.mock('../../../api/endpoints/apartments', () => ({
  pauseInternet: vi.fn(),
  resumeInternet: vi.fn(),
}))

vi.mock('../../../api/endpoints/locks', () => ({
  getLockHistory: vi.fn(),
  downloadElectricityReport: vi.fn(),
}))

import { pauseInternet, resumeInternet } from '../../../api/endpoints/apartments'
import { getLockHistory, downloadElectricityReport } from '../../../api/endpoints/locks'
import PauseModal from './PauseModal'
import ElectricityReportModal from './ElectricityReportModal'
import DoorsCalendarModal from './DoorsCalendarModal'
import InternetCard from '../services/InternetCard'

function renderModal(node) {
  return render(
    <ToastProvider>
      <ModalProvider>{node}</ModalProvider>
    </ToastProvider>
  )
}

const APT = { id: 501, objectId: 3026, code: 'OCT.A.30.3026' }

beforeEach(() => {
  pauseInternet.mockReset()
  resumeInternet.mockReset()
  getLockHistory.mockReset()
  downloadElectricityReport.mockReset()
})

describe('PauseModal (real mode)', () => {
  test('a rejected pauseInternet shows a toast and re-enables the Pause button', async () => {
    pauseInternet.mockRejectedValueOnce(new Error('down'))

    renderModal(<PauseModal apartment={APT} />)

    const pauseBtn = await screen.findByRole('button', { name: /Pause service/ })
    fireEvent.click(pauseBtn)

    expect(await screen.findByText(/Request failed/i)).toBeInTheDocument()
    expect(pauseBtn).not.toBeDisabled()
    expect(pauseInternet).toHaveBeenCalledTimes(1)
    // addressed by the backend flat id (objectId), not the property relation id
    expect(pauseInternet).toHaveBeenCalledWith(3026)
  })
})

describe('InternetCard Resume (real mode)', () => {
  test('a rejected resumeInternet shows a toast and re-enables the Resume button', async () => {
    resumeInternet.mockRejectedValueOnce(new Error('down'))
    const apt = {
      ...APT,
      services: {
        internet: {
          status: 'Paused',
          planId: 'P1',
          provider: 'Silknet',
          tariff: 50,
          renewal: '2026-08-01',
          balance: 0,
          boost: null,
          daysLeft: 10,
          cycleDays: 30,
        },
      },
    }

    renderModal(<InternetCard apt={apt} />)

    const resumeBtn = await screen.findByRole('button', { name: /Resume service/ })
    fireEvent.click(resumeBtn)

    expect(await screen.findByText(/Request failed/i)).toBeInTheDocument()
    expect(resumeBtn).not.toBeDisabled()
    expect(resumeInternet).toHaveBeenCalledTimes(1)
    // addressed by the backend flat id (objectId), not the property relation id
    expect(resumeInternet).toHaveBeenCalledWith(3026)
  })
})

describe('ElectricityReportModal (real mode)', () => {
  test('a rejected downloadElectricityReport toasts, unlocks the modal, and returns to the form step', async () => {
    downloadElectricityReport.mockRejectedValueOnce(new Error('down'))

    renderModal(<ElectricityReportModal apartment={{ ...APT, services: { electricity: { counter: '12345' } } }} />)

    fireEvent.click(await screen.findByRole('button', { name: /Monthly report/ }))

    expect(await screen.findByText(/Request failed/i)).toBeInTheDocument()
    // back on the form step (not stuck on "generating") with a working close
    // button (the modal-locked state during "generating" disables it)
    expect(await screen.findByRole('button', { name: /Monthly report/ })).toBeInTheDocument()
    const closeBtn = screen.getByLabelText('Close')
    expect(closeBtn).not.toBeDisabled()
  })
})

describe('DoorsCalendarModal (real mode)', () => {
  test('a rejected getLockHistory stops the skeleton and shows a retry that reloads', async () => {
    getLockHistory.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ byDay: {}, total: 3 })

    renderModal(<DoorsCalendarModal apartment={APT} />)

    expect(await screen.findByText('Request failed. Please try again.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    // loading resolves and the month grid renders again instead of the error state
    expect(await screen.findByText('June 2026')).toBeInTheDocument()
    expect(screen.queryByText('Request failed. Please try again.')).not.toBeInTheDocument()
    expect(getLockHistory).toHaveBeenCalledTimes(2)
  })
})
