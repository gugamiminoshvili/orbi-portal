import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { checkResetToken, resetPassword } from '../../api/endpoints/passwordReset'
import { RESET_RULES, passwordMeetsRules } from '../../utils/passwordRules'
import { ApiError } from '../../api/errors'
import Button from '../../components/ui/Button'
import Field, { Input } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import AuthLayout from './AuthLayout'
import styles from './Auth.module.css'
import reg from './Register.module.css'
import rules from './Reset.module.css'

// Step 2 of the reset flow. The token arrives in the link's query string.
export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [tokenBad, setTokenBad] = useState(!token)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [repeatTouched, setRepeatTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Check the token before showing the form, so an expired link says so
  // straight away instead of after the user has typed a password twice.
  useEffect(() => {
    let alive = true
    if (!token) {
      setChecking(false)
      return undefined
    }
    checkResetToken(token)
      .then(() => alive && setTokenBad(false))
      .catch(() => alive && setTokenBad(true))
      .finally(() => alive && setChecking(false))
    return () => {
      alive = false
    }
  }, [token])

  const mismatch = repeatTouched && repeat.length > 0 && repeat !== password
  const canSubmit = passwordMeetsRules(password) && repeat === password && !busy

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await resetPassword({ token, password, repeatedPassword: repeat })
      setDone(true)
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : null
      const key = code ? `auth:reset.errors.${code}` : null
      setError(key && t(key) !== key ? t(key) : t('auth:reset.errFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <AuthLayout>
        <p className={styles.subtitle}>{t('auth:reset.checking')}</p>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout>
        <div className={reg.result}>
          <span className={reg['result-ic']}>
            <Icon name="check" />
          </span>
          <h1 className={styles.title}>{t('auth:reset.doneTitle')}</h1>
          <p className={styles.subtitle}>{t('auth:reset.doneBody')}</p>
          <Button className={styles.submitBtn} onClick={() => navigate('/login')}>
            {t('auth:signIn')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (tokenBad) {
    return (
      <AuthLayout>
        <div className={reg.result}>
          <span className={`${reg['result-ic']} ${rules.bad}`}>
            <Icon name="warn" />
          </span>
          <h1 className={styles.title}>{t('auth:reset.badTitle')}</h1>
          <p className={styles.subtitle}>{t('auth:reset.badBody')}</p>
          <Button as={Link} to="/forgot-password" className={styles.submitBtn}>
            {t('auth:reset.requestAgain')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <>
        <h1 className={styles.title}>{t('auth:reset.title')}</h1>
        <p className={styles.subtitle}>{t('auth:reset.body')}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label={t('auth:reset.newPassword')} htmlFor="reset-password">
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              aria-describedby="reset-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {/* The rules go green as they are met — the same live treatment the
              signed-in change-password form uses, so the two teach the same
              thing. Each row also states its state in words, because colour
              on its own cannot carry it. */}
          <div id="reset-rules" className={rules.list}>
            <div className={rules.title}>{t('auth:reset.rulesTitle')}</div>
            <ul>
              {RESET_RULES.map((rule) => {
                const met = rule.test(password)
                return (
                  <li key={rule.key} className={met ? rules.met : ''}>
                    <span className={rules.mark} aria-hidden="true">
                      {met && <Icon name="check" size={11} />}
                    </span>
                    <span>{t(`auth:reset.rules.${rule.key}`)}</span>
                    <span className="sr-only">
                      {t(met ? 'profile:ruleMet' : 'profile:ruleUnmet')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <Field
            label={t('auth:reset.repeatPassword')}
            htmlFor="reset-repeat"
            error={mismatch ? t('auth:reset.errMismatch') : undefined}
          >
            <Input
              id="reset-repeat"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              onBlur={() => setRepeatTouched(true)}
            />
          </Field>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
            {busy ? t('auth:reset.saving') : t('auth:reset.submit')}
          </Button>
        </form>
      </>
    </AuthLayout>
  )
}
