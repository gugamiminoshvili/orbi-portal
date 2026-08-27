import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../i18n'
import { AuthProvider, RequireAuth, useAuth } from '../../context/AuthContext'
import { ApiError } from '../../api/errors'
import { http } from '../../api/client'
import { tokenStore } from '../../api/tokenStore'
import { ToastProvider } from '../../context/ToastContext'
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

function GuardedApp() {
  return (
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
  )
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

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  test('shows an inline error on bad credentials', async () => {
    authApi.login.mockRejectedValueOnce(
      new ApiError(-3, 'credentials do not match', 'CREDENTIALS_DO_NOT_MATCH')
    )
    renderLoginPage()

    // A real address, because the field is type="email" now: the browser
    // blocks submission of a malformed one before any request is made.
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect e-mail or password.')
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

    // A real address, because the field is type="email" now: the browser
    // blocks submission of a malformed one before any request is made.
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bob@example.com' } })
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

    // A real address, because the field is type="email" now: the browser
    // blocks submission of a malformed one before any request is made.
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByPlaceholderText('6-digit code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument()
  })
})

describe('session expiry', () => {
  test('a failed refresh (SESSION_EXPIRED) flips status to anon and RequireAuth redirects to /login', async () => {
    authApi.getUser.mockResolvedValueOnce({ fullname: 'Test User', user_id: 1 })
    tokenStore.setTokens({ access: 'old-access', refresh: 'ref-1' })

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/mobileApi/refresh/')) {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({}) })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    render(
      <MemoryRouter initialEntries={['/apartments']}>
        <ToastProvider>
          <AuthProvider mock={false}>
            <GuardedApp />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    )

    // Hydration resolves first (a valid stored session), so the guarded
    // route renders normally.
    expect(await screen.findByText('secret page')).toBeInTheDocument()

    // Some later request's 401 hits a dead refresh token — the client's
    // onSessionExpired subscription (wired up in AuthContext) must flip
    // status to 'anon', which RequireAuth turns into a redirect on the very
    // next render.
    await act(async () => {
      await http('/mobileApi/user/').catch(() => {})
    })

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()

    globalThis.fetch = originalFetch
  })
})
