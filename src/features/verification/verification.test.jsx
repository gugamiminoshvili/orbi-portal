import { useState } from 'react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n'
import { setLang } from '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'
import { ModalProvider } from '../../context/ModalContext'
import { VerificationProvider, useVerification } from '../../context/VerificationContext'
import { reasonKey, SUPPORT_WHATSAPP } from './reasons'

// The gate reads the signed-in user, so the auth context is stubbed rather
// than the network: what matters here is what it does with a given status.
let mockUser = null
vi.mock('../../context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  // Only the reader is stubbed: RequireAuth and the provider stay real, so
  // the routes below mount exactly as they do in the app.
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

  // The live spelling, confirmed 2026-09-04: snake_case, lower case.
  test("the backend's own spelling lands on the right reason", () => {
    expect(reasonKey('identity_verification_failed')).toBe('identity_failed')
    expect(reasonKey('passport_not_attached')).toBe('not_attached')
    expect(reasonKey('user_data_mismatch')).toBe('data_mismatch')
    expect(reasonKey('personal_information_does_not_match_company_records')).toBe(
      'company_mismatch'
    )
    expect(reasonKey('no_active_ownership')).toBe('no_ownership')
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

  // The reason field carries stale or meaningless content on any status but
  // 3, so a pending or active account must never be given a rejection
  // reason to display.
  test('the reason is only read when the status is invalid', () => {
    mockUser = { is_passport_valid: 1, passport_invalidity_reason: 'no_active_ownership' }
    renderAt()
    expect(screen.getByText('blocked:false')).toBeInTheDocument()
    expect(screen.queryByText('No property found')).not.toBeInTheDocument()
  })

  test('a verified account is not blocked', () => {
    mockUser = { is_passport_valid: 2 }
    renderAt()
    expect(screen.getByText('blocked:false')).toBeInTheDocument()
  })

  test('an invalid account is blocked, and the dialog opens on sign-in', () => {
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'no_active_ownership' }
    renderAt()

    expect(screen.getByText('blocked:true')).toBeInTheDocument()
    // Announced once on arrival, with the reason's own wording.
    expect(screen.getByText('No property found')).toBeInTheDocument()
  })

  test('a guarded action opens the dialog instead of running', () => {
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'user_data_mismatch' }
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    fireEvent.click(screen.getByText('do the thing'))
    expect(screen.getByText('ran:false')).toBeInTheDocument()
    expect(screen.getByText("Details don't match")).toBeInTheDocument()
  })

  // The labels are per state, from the prototype: the same "Contact support"
  // is the ghost under a re-upload for one reason and the primary for
  // another, so both the wording and the order are asserted.
  test('the reason decides the way out: a photo problem offers a re-upload', () => {
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'passport_not_attached' }
    renderAt()
    // The button opens the uploader inside the same dialog, the way the
    // prototype's `view` switch does — it is not a link out of it.
    fireEvent.click(screen.getByRole('button', { name: /Upload passport/ }))
    expect(screen.getByText('Upload passport photo')).toBeInTheDocument()
    expect(screen.getByText(/max 50MB/)).toBeInTheDocument()

    // And back again, without losing the reason it came from.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Passport not uploaded')).toBeInTheDocument()
  })

  test('the button order follows the reason, not a fixed layout', () => {
    // data_mismatch: re-upload on top, support beneath.
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'user_data_mismatch' }
    const { unmount } = renderAt()
    let acts = [...document.querySelectorAll('[role=dialog] a, [role=dialog] button')]
      .map((el) => el.textContent.trim())
      .filter((x) => x && !/close/i.test(x))
    expect(acts).toEqual(['Re-upload photo', 'Contact support'])
    unmount()

    // company_mismatch: support on top, "Later" beneath — no photo helps.
    mockUser = {
      is_passport_valid: 3,
      passport_invalidity_reason: 'personal_information_does_not_match_company_records',
    }
    renderAt()
    acts = [...document.querySelectorAll('[role=dialog] a, [role=dialog] button')]
      .map((el) => el.textContent.trim())
      .filter((x) => x && !/close/i.test(x))
    expect(acts).toEqual(['Contact support', 'Later'])
  })

  test('a problem no photo can fix offers WhatsApp instead', () => {
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'no_active_ownership' }
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: /Contact support/ }))

    // The number is shown before it is dialled, so the owner can read it,
    // copy it, or use another phone.
    expect(screen.getByText('+995 595 071 931')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Connect on WhatsApp/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/995595071931'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  // The tooltip on the status shows the dialog's own wording for the actual
  // reason (owner call 2026-09-04) — not a second, vaguer sentence written
  // beside it, which is how the Pending tooltip came to claim actions were
  // unavailable while its dialog said nothing further was needed.
  test('the status tooltip carries the dialog wording for the actual reason', () => {
    mockUser = {
      is_passport_valid: 3,
      passport_invalidity_reason: 'identity_verification_failed',
    }
    renderApp('/profile')

    // Close the dialog the arrival opened, then hover the status card.
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0])
    const status = document.querySelector('[data-account-status="invalid"]').closest('button')
    fireEvent.mouseEnter(status)

    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Identity not verified')
    expect(tip).toHaveTextContent(/could not be verified from the uploaded passport/)
  })

  // A torn passport for a rejected verification, a clock while one is under
  // way (owner call 2026-09-04). A general warning triangle says something
  // is wrong; the torn document says what.
  test('the status wears the glyph its state calls for', () => {
    mockUser = { is_passport_valid: 3, passport_invalidity_reason: 'no_active_ownership' }
    const { unmount } = renderApp('/profile')
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0])
    const card = document
      .querySelector('[data-account-status="invalid"]')
      .closest('[class*="card"]')
    expect(card.querySelector('svg circle')).toBeInTheDocument() // the photo
    const invalidPath = card.querySelector('svg path').getAttribute('d')
    unmount()

    mockUser = { is_passport_valid: 1 }
    renderApp('/profile')
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0])
    const pending = document
      .querySelector('[data-account-status="pending"]')
      .closest('[class*="card"]')
    expect(pending.querySelector('svg path').getAttribute('d')).not.toBe(invalidPath)
  })

  test('a pending account gets the pending dialog wording, not a debt of its own', () => {
    mockUser = { is_passport_valid: 1 }
    renderApp('/profile')

    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0])
    fireEvent.mouseEnter(document.querySelector('[data-account-status="pending"]').closest('button'))

    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Verification in progress')
    expect(tip).toHaveTextContent(/within 3 working days/)
  })

  // The status the owner asked to be announced too (2026-09-04). It is not a
  // block: nothing is guarded by it, and its own copy says so.
  test('a pending account is announced but not restricted', () => {
    mockUser = { is_passport_valid: 1 }
    renderAt()
    expect(screen.getByText('Verification in progress')).toBeInTheDocument()
    expect(screen.getByText('blocked:false')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Got it/ }))
    fireEvent.click(screen.getByText('do the thing'))
    expect(screen.getByText('ran:true')).toBeInTheDocument()
  })

  test('entering Support states why nothing can be sent', () => {
    mockUser = { is_passport_valid: 3 }
    renderAt('/support')
    expect(screen.getByText('Your account is not verified')).toBeInTheDocument()
  })

  // The owner asked for this explicitly: the dialog is the one thing they
  // most need to have understood, so it is restated in the language just
  // picked. It must not fire on the first render, or every page load would
  // open it twice.
  test('a language change restates it — but the first render does not', () => {
    mockUser = { is_passport_valid: 3 }
    renderAt()
    // Once, from sign-in.
    expect(screen.getAllByText('Your account is not verified')).toHaveLength(1)

    act(() => setLang('ka'))
    expect(screen.getByText('თქვენი ანგარიში ვერიფიცირებული არ არის')).toBeInTheDocument()
  })

  test('a verified account is left alone when the language changes', () => {
    mockUser = { is_passport_valid: 2 }
    renderAt()
    act(() => setLang('ka'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// The spec is "the module opens, but every action inside it is blocked", so
// the entry points are not enough: /support/new is reachable by typing the
// URL, and an existing thread can be replied to without passing a button
// that was guarded where it was rendered.
function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ModalProvider>
          <VerificationProvider>
            <AppRoutes />
          </VerificationProvider>
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('Tickets: readable, but not actionable', () => {
  test('submitting a new ticket opens the dialog and creates nothing', async () => {
    mockUser = { is_passport_valid: 3 }
    renderApp('/support/new')

    fireEvent.click(await screen.findByText('Select topic'))
    const picker = await screen.findByRole('dialog')
    fireEvent.click(within(picker).getByText('Other Request'))
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue/), {
      target: { value: 'Help' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Submit/ }))

    expect(await screen.findByText('Your account is not verified')).toBeInTheDocument()
    // The submit did not go through, so the chat it would have opened is not
    // on screen: the typed text is still sitting in the composer.
    expect(screen.getByPlaceholderText(/Describe your issue/)).toHaveValue('Help')
  })

  test('a verified account still gets through', async () => {
    mockUser = { is_passport_valid: 2 }
    renderApp('/support/new')

    fireEvent.click(await screen.findByText('Select topic'))
    const picker = await screen.findByRole('dialog')
    fireEvent.click(within(picker).getByText('Other Request'))
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue/), {
      target: { value: 'Help' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Submit/ }))

    expect(await screen.findByText('Help')).toBeInTheDocument()
  })
})
