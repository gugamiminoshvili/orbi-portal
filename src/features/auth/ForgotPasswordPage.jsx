import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { requestPasswordReset } from '../../api/endpoints/passwordReset'
import Button from '../../components/ui/Button'
import Field, { Input } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import AuthLayout from './AuthLayout'
import styles from './Auth.module.css'
import reg from './Register.module.css'

// Step 1 of the reset flow: ask for the address, then say the same thing
// whatever happened.
export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      // Deliberately not surfaced per-case: "no such customer" and "sent"
      // must look identical, or this page becomes a way to test which
      // addresses are registered. Only a genuine transport failure is worth
      // reporting, and that is what the generic message covers.
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className={reg.result}>
          <span className={reg['result-ic']}>
            <Icon name="mail" />
          </span>
          <h1 className={styles.title}>{t('auth:forgot.sentTitle')}</h1>
          <p className={styles.subtitle}>{t('auth:forgot.sentBody')}</p>
          <p className={styles.notice}>{t('auth:forgot.expiry')}</p>
          <Button as={Link} to="/login" className={styles.submitBtn}>
            {t('auth:reg.backToSignIn')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <>
        <h1 className={styles.title}>{t('auth:forgot.title')}</h1>
        <p className={styles.subtitle}>{t('auth:forgot.body')}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label={t('auth:email')} htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className={styles.submitBtn} disabled={busy}>
            {busy ? t('auth:forgot.sending') : t('auth:forgot.submit')}
          </Button>
        </form>
        <p className={styles.alt}>
          <Link to="/login">{t('auth:reg.backToSignIn')}</Link>
        </p>
      </>
    </AuthLayout>
  )
}
