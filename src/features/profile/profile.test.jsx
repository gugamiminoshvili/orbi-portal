import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'
import { accountStatus, needsAttention } from '../../utils/accountStatus'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('accountStatus', () => {
  test('derives valid/invalid from webAccess when no explicit status is sent', () => {
    expect(accountStatus({ webAccess: true })).toBe('valid')
    expect(accountStatus({ webAccess: false })).toBe('invalid')
    expect(accountStatus(undefined)).toBe('invalid')
  })

  test('an explicit backend status wins, in either spelling and any casing', () => {
    expect(accountStatus({ webAccess: true, status: 'PENDING VERIFICATION' })).toBe('pending')
    expect(accountStatus({ webAccess: true, accountStatus: 'pending_verification' })).toBe('pending')
    expect(accountStatus({ webAccess: false, status: 'VALID' })).toBe('valid')
  })

  test('only a non-valid status needs surfacing in the header', () => {
    expect(needsAttention('valid')).toBe(false)
    expect(needsAttention('pending')).toBe(true)
    expect(needsAttention('invalid')).toBe(true)
  })
})

describe('header user menu', () => {
  test('greets the user and opens a menu with profile links', async () => {
    renderApp(['/dashboard'])

    const trigger = await screen.findByRole('button', { expanded: false, name: /Guga/ })
    // A verified account is NOT badged in the header (owner call).
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('menuitem', { name: /My profile/ })).toHaveAttribute('href', '/profile')
    // The entry is labelled for what it actually does — change the password.
    expect(screen.getByRole('menuitem', { name: /Change password/ })).toHaveAttribute(
      'href',
      '/profile?tab=security'
    )
    // Nor in the open menu's head — a healthy account shows its email there
    // instead of a redundant status line (owner call).
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
    expect(screen.queryByText(/Account status/)).not.toBeInTheDocument()
    expect(screen.getAllByText('guga@example.com').length).toBeGreaterThan(0)
  })
})

describe('profile page', () => {
  test('renders the identity card and read-only detail rows', async () => {
    renderApp(['/profile'])

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('Guga M.').length).toBeGreaterThan(0)
    // Shown twice on purpose: the identity card's mailto link and the detail row.
    expect(screen.getAllByText('guga@example.com')).toHaveLength(2)
    expect(screen.getByText('995 591 800 593')).toBeInTheDocument()
    expect(screen.getByText('FE682177')).toBeInTheDocument()
    // Customer ID from the live user payload's `id`.
    expect(screen.getByText('23818')).toBeInTheDocument()
  })

  test('?tab=security keeps submit disabled until all three fields are filled', async () => {
    renderApp(['/profile?tab=security'])

    const submit = await screen.findByRole('button', { name: 'Update password' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass1' } })
    expect(submit).toBeDisabled() // repeat is still empty

    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'newpass1' } })
    expect(submit).toBeEnabled()
  })

  test('a too-short new password is rejected on submit', async () => {
    renderApp(['/profile?tab=security'])

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Use at least 6 characters.')).toBeInTheDocument()
  })

  test('mismatched repeat password is reported on blur, before any submit', async () => {
    renderApp(['/profile?tab=security'])

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass1' } })
    const repeat = screen.getByLabelText('Repeat new password')
    fireEvent.change(repeat, { target: { value: 'different' } })
    // Nothing yet — the field is still being typed into.
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument()

    fireEvent.blur(repeat)
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()

    // Once flagged it re-checks live, so correcting it clears the message.
    fireEvent.change(repeat, { target: { value: 'newpass1' } })
    await waitFor(() => expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument())
  })

  test('a valid submission clears the form (mock mode has no password endpoint)', async () => {
    renderApp(['/profile?tab=security'])

    const current = await screen.findByLabelText('Current password')
    fireEvent.change(current, { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByRole('button', { name: /Update password/ }))

    await waitFor(() => expect(current).toHaveValue(''))
  })
})
