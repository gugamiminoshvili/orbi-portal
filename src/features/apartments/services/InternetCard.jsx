import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useToast } from '../../../context/ToastContext'
import { useModal } from '../../../context/ModalContext'
import { resumeInternet } from '../../../api/endpoints/apartments'
import { planById } from '../../../api/mock/plans'
import { fmt } from '../../../utils/format'
import Icon from '../../../components/ui/Icon'
import Button from '../../../components/ui/Button'
import buttonStyles from '../../../components/ui/Button.module.css'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
import ProgressRing from '../../../components/ui/ProgressRing'
import ServiceShell, { Metric } from './ServiceShell'
import ChangePackageModal from '../modals/ChangePackageModal'
import BoostModal from '../modals/BoostModal'
import PauseModal from '../modals/PauseModal'
import styles from '../Detail.module.css'

// Ported from svcInternet() at reference/orbi-portal-redesign.html lines 1395-1422.
// Three states: no plan yet, paused, active. `onReload` re-fetches the
// apartment after a direct mutation (Resume) — modals (Task 13) will call
// the same callback after Change package / Boost / Pause.
export default function InternetCard({ apt, onReload }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { openModal } = useModal()
  const s = apt.services.internet
  const neg = s.balance < 0
  const active = s.status === 'Active'
  const paused = s.status === 'Paused'
  const pl = planById(s.planId)
  // Real mode: planId is the backend's net-tariff id, which the static mock
  // catalog can't resolve — but the adapted agreement carries the plan's own
  // name (orbinet_agreement.net_tariff.name, Task L1), so prefer the mock
  // catalog hit (mock mode) and fall back to the agreement's name.
  const planName = pl ? pl.name : s.planName && s.planName !== '—' ? s.planName : ''
  const [resuming, setResuming] = useState(false)

  const sub = active
    ? `${planName} · ${s.provider}`
    : paused
      ? t('apartments:pausedLabel')
      : t('apartments:noActivePlan')

  const right = (
    <Metric label={t('apartments:monthly')}>
      {active || paused ? (
        <span style={{ fontSize: 14 }}>{fmt(s.tariff)}</span>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('apartments:inactive')}</span>
      )}
    </Metric>
  )

  async function handleResume() {
    setResuming(true)
    try {
      await resumeInternet(apt.id)
      onReload?.()
      toast(t('apartments:resumedToast'))
    } catch {
      toast(t('common:requestFailed'))
    } finally {
      setResuming(false)
    }
  }

  function openChangePackage() {
    openModal(<ChangePackageModal apartment={apt} onDone={onReload} />, { size: 'xl' })
  }
  function openBoost() {
    openModal(<BoostModal apartment={apt} onDone={onReload} />, { size: 'md' })
  }
  function openPause() {
    openModal(<PauseModal apartment={apt} onDone={onReload} />, { size: 'md' })
  }

  let body
  if (!s.planId) {
    body = (
      <EmptyState icon="tv" title={t('apartments:noActiveSubscriptionTitle')}>
        <p>{t('apartments:noActiveSubscriptionBody')}</p>
        <Button size="sm" onClick={openChangePackage}>
          {t('apartments:choosePackage')}
        </Button>
      </EmptyState>
    )
  } else if (paused) {
    body = (
      <>
        <div className={styles['warn-box']} style={{ marginBottom: 14 }}>
          <div className={styles.wi}>
            <Icon name="pause" />
          </div>
          <div>
            <h4>{t('apartments:servicePausedTitle')}</h4>
            <p>
              <Trans
                i18nKey="apartments:servicePausedBody"
                values={{ plan: planName, fee: fmt(s.tariff) }}
                components={{ b: <b /> }}
              />
            </p>
          </div>
        </div>
        <div className={styles['sub-actions']}>
          <Button size="sm" disabled={resuming} onClick={handleResume}>
            {t('apartments:resumeService')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast(t('apartments:subscriptionDownloaded'))}>
            <Icon name="dl" /> {t('common:download')}
          </Button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <div className={styles['sub-panel']}>
          <div className={styles.cell}>
            <div className={styles.k}>{t('apartments:serviceStatus')}</div>
            <div className={styles.v}>
              <Badge tone="pos" dot>{t('apartments:active')}</Badge>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              {t('apartments:providerPlanLine', {
                provider: s.provider,
                plan: planName,
                mbps: pl ? pl.mbps : '',
              })}
            </div>
          </div>
          <div className={styles.cell}>
            <div className={styles.k}>{t('apartments:monthlyTariff')}</div>
            <div className={styles.v}>{fmt(s.tariff)}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              {t('apartments:renews', { date: s.renewal })}
            </div>
          </div>
          <div className={`${styles.cell} ${styles.ringc}`}>
            <ProgressRing
              left={s.daysLeft}
              total={s.cycleDays}
              label={t('apartments:daysLeftShort')}
              ariaLabel={t('apartments:ringAria', { left: s.daysLeft, total: s.cycleDays })}
            />
            <div>
              <div className={styles.k} style={{ margin: 0 }}>{t('apartments:billingCycle')}</div>
              <div className={styles.v} style={{ fontSize: 14 }}>{t('apartments:daysLeftValue', { count: s.daysLeft })}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('apartments:until', { date: s.renewal })}</div>
            </div>
          </div>
        </div>

        {s.boost && (
          <div className={styles['boost-banner']}>
            <Icon name="rocket" />{' '}
            {t('apartments:activeBoost', {
              details: `${s.boost.name} (${s.boost.speed}, ${s.boost.duration})`,
            })}
          </div>
        )}

        {neg && (
          <div className={styles['neg-strip']}>
            <span style={{ fontWeight: 600, color: 'var(--neg-ink)' }}>{t('apartments:outstandingBalance')}</span>
            <span className={`${styles.money} ${styles.neg}`}>{fmt(-s.balance)}</span>
          </div>
        )}

        <div className={styles['sub-actions']}>
          <Button size="sm" onClick={openChangePackage}>
            <Icon name="swap" /> {t('apartments:changePackage')}
          </Button>
          <Button variant="soft" size="sm" onClick={openBoost}>
            <Icon name="rocket" /> {t('apartments:boost')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: 'var(--warn-ink)', borderColor: '#ffe1a8' }}
            onClick={openPause}
          >
            <Icon name="pause" /> {t('apartments:pause')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast(t('apartments:subscriptionDownloaded'))}>
            <Icon name="dl" /> {t('common:download')}
          </Button>
          {neg && (
            <Link to={`/pay/${apt.id}`} className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}>
              {t('apartments:payAmount', { amount: fmt(-s.balance) })}
            </Link>
          )}
        </div>
      </>
    )
  }

  return (
    <ServiceShell icon="wifi" iconBg="#ece7ff" iconColor="#6b4bff" name={t('apartments:internetName')} sub={sub} right={right}>
      {body}
    </ServiceShell>
  )
}
