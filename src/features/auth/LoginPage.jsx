import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { sendVerify } from '../../api/auth'
import { ApiError } from '../../api/errors'
import Button from '../../components/ui/Button'
import Field, { Input } from '../../components/ui/Field'
import styles from './Login.module.css'
import logo from '../../assets/orbi-logo.svg'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { status, login, submitVerify } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  // Already signed in (mock mode always is): bounce to wherever the guard
  // caught the user, or a sane default.
  useEffect(() => {
    if (status !== 'authed') return
    const from = location.state?.from
    const dest = from ? `${from.pathname}${from.search || ''}` : '/apartments'
    navigate(dest, { replace: true })
  }, [status, location.state, navigate])

  function errorMessage(err) {
    const errorCode = err instanceof ApiError ? err.errorCode : null
    if (errorCode && i18n.exists(`auth:errors.${errorCode}`)) {
      return t(`auth:errors.${errorCode}`)
    }
    return t('auth:errors.generic')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await submitVerify(code)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await sendVerify()
    } catch {
      // Best-effort — nothing actionable to show the user here.
    } finally {
      setResending(false)
    }
  }

  if (status === 'authed') return null

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          {/* Same mark as the rail. alt is empty because the wordmark next
              to it already says ORBI. */}
          <img src={logo} alt="" className={styles.logo} />
          <div>
            <b>ORBI</b>
            <span>{t('common:ownerPortal')}</span>
          </div>
        </div>

        {status === 'verify' ? (
          <>
            <h1 className={styles.title}>{t('auth:verifyTitle')}</h1>
            <p className={styles.subtitle}>{t('auth:verifyBody')}</p>
            <form className={styles.form} onSubmit={handleVerify}>
              <Field label={t('auth:codePlaceholder')} htmlFor="verify-code">
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={t('auth:codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </Field>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className={styles.submitBtn} disabled={submitting}>
                {t('auth:confirm')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={resending}
              >
                {t('auth:resend')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{t('auth:title')}</h1>
            <p className={styles.subtitle}>{t('auth:subtitle')}</p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <Field label={t('auth:username')} htmlFor="login-username">
                <Input
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label={t('auth:password')} htmlFor="login-password">
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className={styles.submitBtn} disabled={submitting}>
                {t('auth:signIn')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
