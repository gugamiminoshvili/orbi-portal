import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n'
import { ApiError } from '../../api/errors'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'

vi.mock('../../api/endpoints/passwordReset', () => ({
  requestPasswordReset: vi.fn(),
  checkResetToken: vi.fn(),
  resetPassword: vi.fn(),
}))
vi.mock('../../api/auth', () => ({
  login: vi.fn(), getUser: vi.fn(), logout: vi.fn(), verifyCode: vi.fn(),
  sendVerify: vi.fn(), registerDevice: vi.fn(), patchUserLang: vi.fn(),
}))

import {
  requestPasswordReset,
  checkResetToken,
  resetPassword,
} from '../../api/endpoints/passwordReset'

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split('?')[0]} element={element} />
        <Route path="/login" element={<div>sign in page</div>} />
        <Route path="/forgot-password" element={<div>ask again page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  requestPasswordReset.mockResolvedValue({ ok: true })
  checkResetToken.mockResolvedValue({ ok: true })
  resetPassword.mockResolvedValue({ ok: true })
})

describe('ForgotPasswordPage', () => {
  test('sends the address and confirms', async () => {
    renderAt('/forgot-password', <ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send the link' }))

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('a@b.com'))
    expect(await screen.findByText('Check your e-mail')).toBeInTheDocument()
    // The one-hour limit is stated where it matters, not left to be discovered.
    expect(screen.getByText(/works for one hour/)).toBeInTheDocument()
  })

  test('an unknown address gets the same answer as a known one', async () => {
    // Otherwise this page becomes a way to test which addresses are registered.
    requestPasswordReset.mockRejectedValue(new ApiError(-1, 'no such customer', 'NOT_FOUND'))
    renderAt('/forgot-password', <ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send the link' }))

    expect(await screen.findByText('Check your e-mail')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  test('a dead link says so instead of showing a form that cannot work', async () => {
    checkResetToken.mockRejectedValue(new ApiError(-1, 'expired', 'TOKEN_EXPIRED'))
    renderAt('/reset-password?token=abc', <ResetPasswordPage />)

    expect(await screen.findByText('This link no longer works')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  test('a link with no token at all is treated the same way', async () => {
    renderAt('/reset-password', <ResetPasswordPage />)
    expect(await screen.findByText('This link no longer works')).toBeInTheDocument()
    expect(checkResetToken).not.toHaveBeenCalled()
  })

  test('the rules go green one by one, and save stays shut until all five pass', async () => {
    renderAt('/reset-password?token=abc', <ResetPasswordPage />)
    const field = await screen.findByLabelText('New password')
    const save = screen.getByRole('button', { name: 'Save the password' })

    const met = () => document.querySelectorAll('li[class*="met"]').length
    expect(met()).toBe(0)
    expect(save).toBeDisabled()

    fireEvent.change(field, { target: { value: 'abcdefgh' } })
    expect(met()).toBe(3) // length, lowercase, no spaces
    fireEvent.change(field, { target: { value: 'Abcdefg1' } })
    expect(met()).toBe(5)

    // Still shut: the repeat has to match too.
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Repeat the new password'), {
      target: { value: 'Abcdefg1' },
    })
    expect(save).not.toBeDisabled()
  })

  test('a space anywhere fails the no-spaces rule', async () => {
    renderAt('/reset-password?token=abc', <ResetPasswordPage />)
    const field = await screen.findByLabelText('New password')
    fireEvent.change(field, { target: { value: 'Abcd efg1' } })
    expect(screen.getByRole('button', { name: 'Save the password' })).toBeDisabled()
  })

  test('saving posts the token with both passwords and confirms', async () => {
    renderAt('/reset-password?token=tok123', <ResetPasswordPage />)
    const field = await screen.findByLabelText('New password')
    fireEvent.change(field, { target: { value: 'Abcdefg1' } })
    fireEvent.change(screen.getByLabelText('Repeat the new password'), {
      target: { value: 'Abcdefg1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save the password' }))

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        token: 'tok123',
        password: 'Abcdefg1',
        repeatedPassword: 'Abcdefg1',
      })
    )
    expect(await screen.findByText('Password changed')).toBeInTheDocument()
  })

  test('a failure at the last step is reported, not swallowed', async () => {
    // The backend guide flags a bug here: a token that just validated can
    // still be rejected on the final call. The user has to be told.
    resetPassword.mockRejectedValue(new ApiError(-1, 'token not found'))
    renderAt('/reset-password?token=tok123', <ResetPasswordPage />)
    const field = await screen.findByLabelText('New password')
    fireEvent.change(field, { target: { value: 'Abcdefg1' } })
    fireEvent.change(screen.getByLabelText('Repeat the new password'), {
      target: { value: 'Abcdefg1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save the password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Request a new link')
  })
})
