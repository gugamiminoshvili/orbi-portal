import { useState } from 'react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n'
import { setLang } from '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { VerificationProvider, useVerification } from '../../context/VerificationContext'
import { reasonKey, SUPPORT_WHATSAPP } from './reasons'

// The gate reads the signed-in user, so the auth context is stubbed rather
// than the network: what matters here is what it does with a given status.
let mockUser = null
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, status: 'authed' }),
}))

// The guarded action writes into the DOM, so whether it ran is observable
// the same way the user would see it — and nothing outside the component is
// mutated.
function Probe() {
  const { blocked, guard } = useVerification()
  const [ran, setRan] = useState(false)
  return (
    <div>
      <span>blocked:{String(blocked)}</span>
      <span>ran:{String(ran)}</span>
      <button onClick={guard(() => setRan(true))}>do the thing</button>
    </div>
  )
}

function renderAt(path = '/apartments') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ModalProvider>
          <VerificationProvider>
            <Routes>
              <Route path="*" element={<Probe />} />
            </Routes>
          </VerificationProvider>
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  setLang('en')
  mockUser = null
})

describe('reasonKey', () => {
  test('accepts the back-office labels in any spelling', () => {
    expect(reasonKey('Passport Not Attached')).toBe('not_attached')
    expect(reasonKey('IDENTITY_VERIFICATION_FAILED')).toBe('identity_failed')
    expect(reasonKey('user-data-mismatch')).toBe('data_mismatch')
    expect(reasonKey('Personal Information Does Not Match Company Records')).toBe('company_mismatch')
    expect(reasonKey('No Active Ownership')).toBe('no_ownership')
  })

  test('anything unrecognised falls back to the generic reason', () => {
    // Better a message that offers support than one that guesses at a fix.
    expect(reasonKey('something new the back office added')).toBe('generic')
    expect(reasonKey(undefined)).toBe('generic')
  })

  test('the support number is the shared one, not a personal line', () => {
    expect(SUPPORT_WHATSAPP).toBe('995595071931')
  })
})

describe('the gate', () => {
  test('does nothing while the backend sends no status', () => {
    // /user/ does not send it yet. Blocking on a guess would lock people out
    // of a working account.
    mockUser = { webAccess: true }
    renderAt()
    expect(screen.getByText('blocked:false')).toBeInTheDocument()

    fireEvent.click(screen.getByText('do the thing'))
    expect(screen.getByText('ran:true')).toBeInTheDocument()
  })

  test('a verified account is not blocked', () => {
    mockUser = { is_passport_valid: 2 }
    renderAt()
    expect(screen.getByText('blocked:false')).toBeInTheDocument()
  })

  test('an invalid account is blocked, and the dialog opens on sign-in', () => {
    mockUser = { is_passport_valid: 3, verification_reason: 'No Active Ownership' }
    renderAt()

    expect(screen.getByText('blocked:true')).toBeInTheDocument()
    // Announced once on arrival, with the reason's own wording.
    expect(screen.getByText('No property found')).toBeInTheDocument()
  })

  test('a guarded action opens the dialog instead of running', () => {
    mockUser = { is_passport_valid: 3, verification_reason: 'User Data Mismatch' }
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    fireEvent.click(screen.getByText('do the thing'))
    expect(screen.getByText('ran:false')).toBeInTheDocument()
    expect(screen.getByText("Details don't match")).toBeInTheDocument()
  })

  test('the reason decides the way out: a photo problem offers a re-upload', () => {
    mockUser = { is_passport_valid: 3, verification_reason: 'Passport Not Attached' }
    renderAt()
    expect(screen.getByRole('link', { name: /Upload the photo again/ })).toBeInTheDocument()
  })

  test('a problem no photo can fix offers WhatsApp instead', () => {
    mockUser = { is_passport_valid: 3, verification_reason: 'No Active Ownership' }
    renderAt()
    const link = screen.getByRole('link', { name: /Contact support/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/995595071931'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('entering Support states why nothing can be sent', () => {
    mockUser = { is_passport_valid: 3 }
    renderAt('/support')
    expect(screen.getByText('Your account is not verified')).toBeInTheDocument()
  })
})
