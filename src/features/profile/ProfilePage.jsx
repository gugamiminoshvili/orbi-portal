import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { changePassword } from '../../api/auth'
import { USE_MOCK } from '../../api/client'
import { accountStatus, STATUS_TONE } from '../../utils/accountStatus'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Seg } from '../../components/ui/Badge'
import fieldStyles from '../../components/ui/Field.module.css'
import styles from './Profile.module.css'

function initials(fullname) {
  return (fullname || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const MIN_PASSWORD = 6

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'security' ? 'security' : 'profile'
  useCrumbs([{ label: t('profile:title') }])

  const name = user?.fullname || user?.username || '—'
  const status = accountStatus(user)

  const rows = [
    { key: 'firstName', value: user?.fName || user?.fNameEng },
    { key: 'lastName', value: user?.lName || user?.lNameEng },
    { key: 'email', value: user?.mail },
    { key: 'phone', value: user?.phone },
    { key: 'personalId', value: user?.personalId },
    { key: 'regDate', value: user?.regDate },
  ]

  return (
    <div>
      <div className={styles['page-head']}>
        <h1>{t('profile:title')}</h1>
      </div>

      <div className={styles.grid}>
        <Card className={styles['id-card']}>
          <div className={styles.avatar}>{initials(name)}</div>
          <div className={styles.name}>{name}</div>
          {user?.mail && <a className={styles.mail} href={`mailto:${user.mail}`}>{user.mail}</a>}
          <Badge tone={STATUS_TONE[status]} className={styles['status-badge']}>
            {t(`profile:status.${status}`)}
          </Badge>
          {user?.id != null && (
            <div className={styles['cust-id']}>
              <span>{t('profile:customerId')}</span>
              <b>{user.id}</b>
            </div>
          )}
        </Card>

        <Card className={styles['pane-card']}>
          <Card.Head>
            <Seg
              options={[
                { value: 'profile', label: t('profile:tabProfile') },
                { value: 'security', label: t('profile:tabSecurity') },
              ]}
              value={tab}
              onChange={(v) => setParams(v === 'security' ? { tab: 'security' } : {}, { replace: true })}
            />
          </Card.Head>
          <Card.Pad>
            {tab === 'profile' ? <ProfileDetails rows={rows} /> : <SecurityPane />}
          </Card.Pad>
        </Card>
      </div>
    </div>
  )
}

function ProfileDetails({ rows }) {
  const { t } = useTranslation()
  return (
    <dl className={styles.rows}>
      {rows.map(({ key, value }) => (
        <div key={key} className={styles.row}>
          <dt>{t(`profile:fields.${key}`)}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

// Maps the documented passwordChange failure codes onto the field they belong
// to; anything else falls back to a generic message.
const ERROR_FIELD = {
  CURRENT_PASSWORD_IS_WRONG: 'current',
  NEW_PASSWORD_IS_THE_SAME: 'next',
  PASSWORD_LENGTH_TOO_SHORT: 'next',
}

function SecurityPane() {
  const { t } = useTranslation()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  function validate() {
    const e = {}
    if (!current) e.current = t('profile:errors.required')
    if (next.length < MIN_PASSWORD) e.next = t('profile:errors.tooShort', { min: MIN_PASSWORD })
    if (next && repeat !== next) e.repeat = t('profile:errors.mismatch')
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length || busy) return

    setBusy(true)
    try {
      if (USE_MOCK) {
        // No password endpoint to exercise in mock mode — the form still
        // validates and reports success so the flow is demoable.
        await new Promise((r) => setTimeout(r, 300))
      } else {
        await changePassword({ currentPassword: current, newPassword: next })
      }
      setCurrent('')
      setNext('')
      setRepeat('')
      toast(t('profile:passwordChanged'))
    } catch (err) {
      const field = ERROR_FIELD[err?.errorCode]
      if (field) {
        setErrors({ [field]: t(`profile:errors.${err.errorCode}`) })
      } else {
        toast(t('common:requestFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles['form-hint']}>{t('profile:passwordHint', { min: MIN_PASSWORD })}</p>
      <PasswordField
        id="current-password"
        label={t('profile:currentPassword')}
        value={current}
        onChange={setCurrent}
        error={errors.current}
        autoComplete="current-password"
      />
      <PasswordField
        id="new-password"
        label={t('profile:newPassword')}
        value={next}
        onChange={setNext}
        error={errors.next}
        autoComplete="new-password"
      />
      <PasswordField
        id="repeat-password"
        label={t('profile:repeatPassword')}
        value={repeat}
        onChange={setRepeat}
        error={errors.repeat}
        autoComplete="new-password"
      />
      <div className={styles['form-foot']}>
        <Button type="submit" disabled={busy}>
          <Icon name="check" /> {t('profile:updatePassword')}
        </Button>
      </div>
    </form>
  )
}

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [shown, setShown] = useState(false)
  const { t } = useTranslation()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles['pw-wrap']}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          className={`${fieldStyles.input} ${error ? styles.invalid : ''}`}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
        />
        <button
          type="button"
          className={styles['pw-toggle']}
          aria-label={t(shown ? 'profile:hidePassword' : 'profile:showPassword')}
          onClick={() => setShown((s) => !s)}
        >
          <Icon name={shown ? 'eye-off' : 'eye'} />
        </button>
      </div>
      {error && <div className={styles.err}>{error}</div>}
    </div>
  )
}
