import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { requestRegistration } from '../../api/endpoints/registration'
import { ApiError } from '../../api/errors'
import {
  PASSPORT_ACCEPT,
  PASSPORT_EXT,
  MAX_PASSPORT_BYTES,
  checkPassportFile,
  formatBytes,
} from '../../utils/passportFile'
import Button from '../../components/ui/Button'
import Field, { Input } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import AuthLayout from './AuthLayout'
import styles from './Auth.module.css'
import reg from './Register.module.css'

const STEPS = ['details', 'name', 'passport']

// Everything the wizard collects is sent in ONE request at the end
// (POST /mobileApi/register2/ takes the whole thing as multipart), so the
// first two steps are pure client-side validation — nothing is stored until
// the last button is pressed.
export default function RegisterPage() {
  const { t } = useTranslation()
  const { status } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    email: '',
    phone: '',
    tin: '',
    name: '',
    lastName: '',
  })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // { matched, message }

  useEffect(() => {
    if (status === 'authed') navigate('/dashboard', { replace: true })
  }, [status, navigate])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // Mirrors what register2 rejects, so the user is told here rather than
  // after a 50 MB upload: names of at least 2 characters with no digits, a
  // TIN of at least 2, a plausible e-mail, and a phone.
  function validateStep(index) {
    const next = {}
    if (index === 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t('auth:reg.errEmail')
      if (form.phone.replace(/\D/g, '').length < 9) next.phone = t('auth:reg.errPhone')
      if (form.tin.trim().length < 2) next.tin = t('auth:reg.errTin')
    }
    if (index === 1) {
      if (form.name.trim().length < 2 || /\d/.test(form.name)) next.name = t('auth:reg.errName')
      if (form.lastName.trim().length < 2 || /\d/.test(form.lastName)) {
        next.lastName = t('auth:reg.errName')
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleNext() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function handleFile(picked) {
    if (!picked) return
    const problem = checkPassportFile(picked)
    if (problem === 'type') {
      setErrors({ file: t('auth:reg.errFileType', { list: PASSPORT_EXT.join(', ') }) })
      setFile(null)
      return
    }
    if (problem === 'size') {
      setErrors({ file: t('auth:reg.errFileSize', { max: formatBytes(MAX_PASSPORT_BYTES) }) })
      setFile(null)
      return
    }
    setErrors({})
    setFile(picked)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setErrors({ file: t('auth:reg.errFileMissing') })
      return
    }
    setBusy(true)
    setSubmitError('')
    try {
      const res = await requestRegistration({
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        tin: form.tin.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        passportFile: file,
      })
      setDone(res)
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : null
      setSubmitError(
        code && t(`auth:reg.errors.${code}`) !== `auth:reg.errors.${code}`
          ? t(`auth:reg.errors.${code}`)
          : t('auth:errors.generic')
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className={reg.result}>
          <span className={reg['result-ic']}>
            <Icon name="check" />
          </span>
          <h1 className={styles.title}>{t('auth:reg.doneTitle')}</h1>
          <p className={styles.subtitle}>
            {done.matched ? t('auth:reg.doneMatched') : t('auth:reg.doneUnmatched')}
          </p>
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
        <div className={reg.head}>
          <div>
            <h1 className={styles.title}>{t('auth:reg.title')}</h1>
            <p className={reg.stepline}>
              {t('auth:reg.stepOf', { n: step + 1, total: STEPS.length })}
              {' · '}
              {t(`auth:reg.steps.${STEPS[step]}`)}
            </p>
          </div>
          {/* Named steps, not just "1 of 3": the dots say where you are, the
              line beside them says what this step is for. */}
          <ol className={reg.dots} aria-label={t('auth:reg.title')}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`${reg.dot} ${i === step ? reg.on : ''} ${i < step ? reg.past : ''}`}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </ol>
        </div>

        <p className={styles.subtitle}>{t(`auth:reg.blurb.${STEPS[step]}`)}</p>

        <form className={styles.form} onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}>
          {step === 0 && (
            <>
              <Field label={t('auth:email')} htmlFor="reg-email" error={errors.email}>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label={t('auth:reg.phone')} htmlFor="reg-phone" error={errors.phone}>
                <Input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+995 5XX XX XX XX"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
              <Field label={t('auth:reg.tin')} htmlFor="reg-tin" error={errors.tin}>
                <Input
                  id="reg-tin"
                  value={form.tin}
                  onChange={(e) => set('tin', e.target.value)}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label={t('auth:reg.firstName')} htmlFor="reg-name" error={errors.name}>
                <Input
                  id="reg-name"
                  autoComplete="given-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
              <Field label={t('auth:reg.lastName')} htmlFor="reg-last" error={errors.lastName}>
                <Input
                  id="reg-last"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <label className={`${reg.drop} ${file ? reg.filled : ''}`}>
                <input
                  type="file"
                  accept={PASSPORT_ACCEPT}
                  hidden
                  onChange={(e) => {
                    handleFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <span className={reg['drop-ic']}>
                  <Icon name={file ? 'check' : 'dl'} />
                </span>
                <span className={reg['drop-t']}>
                  {file ? file.name : t('auth:reg.dropTitle')}
                </span>
                <span className={reg['drop-s']}>
                  {file
                    ? formatBytes(file.size)
                    : t('auth:reg.dropHint', {
                        list: PASSPORT_EXT.join(', '),
                        max: formatBytes(MAX_PASSPORT_BYTES),
                      })}
                </span>
              </label>
              {errors.file && (
                <p className={styles.error} role="alert">
                  {errors.file}
                </p>
              )}
              <div className={reg.reqs}>
                <div className={reg['reqs-t']}>{t('auth:reg.reqTitle')}</div>
                <ul>
                  <li>{t('auth:reg.req1')}</li>
                  <li>{t('auth:reg.req2')}</li>
                  <li>{t('auth:reg.req3')}</li>
                  <li>{t('auth:reg.req4')}</li>
                </ul>
              </div>
            </>
          )}

          {submitError && (
            <p className={styles.error} role="alert">
              {submitError}
            </p>
          )}

          <div className={reg.actions}>
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <Icon name="back" /> {t('common:back')}
              </Button>
            ) : (
              <Button as={Link} to="/login" variant="ghost">
                {t('common:cancel')}
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" onClick={handleNext}>
                {t('auth:reg.next')} <Icon name="arrow" />
              </Button>
            ) : (
              <Button type="submit" disabled={busy}>
                {busy ? t('auth:reg.sending') : t('auth:reg.submit')}
              </Button>
            )}
          </div>
        </form>

        <p className={styles.alt}>
          {t('auth:reg.haveAccount')} <Link to="/login">{t('auth:signIn')}</Link>
        </p>
      </>
    </AuthLayout>
  )
}
