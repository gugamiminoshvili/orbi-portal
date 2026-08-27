import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '../../i18n'
import { ApiError } from '../../api/errors'
import { AuthProvider } from '../../context/AuthContext'
import RegisterPage from './RegisterPage'

vi.mock('../../api/endpoints/registration', () => ({ requestRegistration: vi.fn() }))
vi.mock('../../api/auth', () => ({
  login: vi.fn(), getUser: vi.fn(), logout: vi.fn(), verifyCode: vi.fn(),
  sendVerify: vi.fn(), registerDevice: vi.fn(), patchUserLang: vi.fn(),
}))

import { requestRegistration } from '../../api/endpoints/registration'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider mock={false}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>sign in page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

const file = (name, size = 1024) => {
  const f = new File(['x'], name, { type: '' })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function fillStep1() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+995555123456' } })
  fireEvent.change(screen.getByLabelText('Personal or passport number'), {
    target: { value: '01010101010' },
  })
}
function fillStep2() {
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'John' } })
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  requestRegistration.mockResolvedValue({ matched: true })
})

describe('RegisterPage', () => {
  test('will not advance past step 1 until the details are plausible', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getByText('Enter a valid e-mail address.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3', { exact: false })).toBeInTheDocument()
  })

  test('a name with digits is rejected, matching what the backend enforces', () => {
    renderPage()
    fillStep1()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'J0hn' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } })
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getAllByText('At least two characters, and no digits.').length).toBe(1)
  })

  test('rejects a file the endpoint would reject, before uploading it', () => {
    renderPage()
    fillStep1()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fillStep2()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file('passport.gif')] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Allowed formats')

    fireEvent.change(input, { target: { files: [file('passport.jpg', 60 * 1024 * 1024)] } })
    expect(screen.getByRole('alert')).toHaveTextContent('no larger than 50 MB')

    // heic is allowed even though the browser reports no type for it
    fireEvent.change(input, { target: { files: [file('passport.heic')] } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('passport.heic')).toBeInTheDocument()
  })

  test('sends everything in one request and confirms a matched account', async () => {
    renderPage()
    fillStep1()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fillStep2()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [file('passport.pdf')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit registration' }))

    await waitFor(() => expect(requestRegistration).toHaveBeenCalledTimes(1))
    expect(requestRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John', lastName: 'Doe', tin: '01010101010',
        phone: '+995555123456', email: 'a@b.com',
      })
    )
    expect(await screen.findByText('Request sent')).toBeInTheDocument()
    expect(screen.getByText(/We found your account/)).toBeInTheDocument()
  })

  test('an unmatched request still confirms — the backend stores it either way', async () => {
    requestRegistration.mockResolvedValue({ matched: false })
    renderPage()
    fillStep1()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fillStep2()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [file('passport.png')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit registration' }))

    expect(await screen.findByText(/We will check your details/)).toBeInTheDocument()
  })

  test('a named backend error is shown in the user\'s own language', async () => {
    requestRegistration.mockRejectedValue(
      new ApiError(-1, 'already has web access', 'ALREADY_HAS_WEB_ACCESS')
    )
    renderPage()
    fillStep1()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fillStep2()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [file('passport.jpg')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit registration' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already has access')
  })
})
