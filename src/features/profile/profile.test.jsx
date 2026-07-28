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
    expect(screen.queryByText('Valid')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('menuitem', { name: /My profile/ })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('menuitem', { name: /Security settings/ })).toHaveAttribute(
      'href',
      '/profile?tab=security'
    )
    // The menu header always shows the status, even when it's valid.
    expect(screen.getByText('Valid')).toBeInTheDocument()
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

  test('?tab=security opens the change-password form and validates before submitting', async () => {
    renderApp(['/profile?tab=security'])

    const submit = await screen.findByRole('button', { name: /Update password/ })
    fireEvent.click(submit)

    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument()
  })

  test('mismatched repeat password is rejected', async () => {
    renderApp(['/profile?tab=security'])

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /Update password/ }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
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
