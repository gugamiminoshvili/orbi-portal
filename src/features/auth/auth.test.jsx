import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../i18n'
import { AuthProvider, RequireAuth, useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/errors'
import LoginPage from './LoginPage'
import * as authApi from '../../api/auth'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  verifyCode: vi.fn(),
  sendVerify: vi.fn(),
  logout: vi.fn(),
  getUser: vi.fn(),
}))

function Protected() {
  return <div>secret page</div>
}

function renderGuarded({ mock }) {
  return render(
    <MemoryRouter initialEntries={['/apartments']}>
      <AuthProvider mock={mock}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/apartments"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

function renderLoginPage({ mock = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider mock={mock}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('RequireAuth', () => {
  test('redirects anonymous users to /login (real mode)', () => {
    renderGuarded({ mock: false })

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  test('passes through in mock mode', () => {
    renderGuarded({ mock: true })

    expect(screen.getByText('secret page')).toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  test('renders username, password fields and a sign-in button', () => {
    renderLoginPage()

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  test('shows an inline error on bad credentials', async () => {
    authApi.login.mockRejectedValueOnce(
      new ApiError(-3, 'credentials do not match', 'CREDENTIALS_DO_NOT_MATCH')
    )
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.')
  })

  test('successful login hydrates the full profile via getUser', async () => {
    authApi.login.mockResolvedValueOnce({ status: 'ok', user: { user_id: 1, mail: 'a@b.com' } })
    authApi.getUser.mockResolvedValueOnce({ fullname: 'Test User', user_id: 1 })

    function WhoAmI() {
      const { user } = useAuth()
      return <div>hello {user?.fullname}</div>
    }

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider mock={false}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/apartments" element={<WhoAmI />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    // Redirected off /login to the default destination, with the profile
    // fetched from /mobileApi/user/ merged into the auth user.
    expect(await screen.findByText('hello Test User')).toBeInTheDocument()
    expect(authApi.getUser).toHaveBeenCalledTimes(1)
  })

  test('shows the device-verification step when login returns status verify', async () => {
    authApi.login.mockResolvedValueOnce({ status: 'verify', user: { user_id: 5 } })
    renderLoginPage()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByPlaceholderText('6-digit code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument()
  })
})
