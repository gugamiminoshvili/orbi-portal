import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { USE_MOCK } from '../../../api/client'
import { changePackage, getAgreement, getTariffs } from '../../../api/endpoints/apartments'
import { PLANS } from '../../../api/mock/plans'
import { fmt } from '../../../utils/format'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import { Chip } from '../../../components/ui/Badge'
import Skeleton from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import modalStyles from '../../../context/Modal.module.css'
import styles from './Plans.module.css'

// Real-mode data source: the plan catalog comes from GET /internettv/tariff/
// (getTariffs) and the current plan id from GET /internettv/?flat=
// (getAgreement) — the real-mode apartment shape carries no planId of its
// own (/properties/ doesn't supply one; see adaptServicesFromProperty).
// Mock mode keeps the static PLANS import and the apartment's own
// services.internet.planId, exactly as before.
function usePlanCatalog(apartment) {
  const [state, setState] = useState(() =>
    USE_MOCK
      ? { loading: false, plans: PLANS, currentPlanId: apartment.services.internet.planId, error: false }
      : { loading: true, plans: [], currentPlanId: null, error: false }
  )
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (USE_MOCK) return undefined
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: false }))
    Promise.all([getTariffs(), getAgreement(apartment.objectId ?? apartment.id)])
      .then(([tariffs, agreement]) => {
        if (cancelled) return
        setState({ loading: false, plans: tariffs.plans, currentPlanId: agreement.planId, error: false })
      })
      .catch(() => {
        if (cancelled) return
        setState({ loading: false, plans: [], currentPlanId: null, error: true })
      })
    return () => {
      cancelled = true
    }
  }, [apartment, reloadKey])

  return { ...state, retry: () => setReloadKey((k) => k + 1) }
}

// Ported from openChangePkg()/pkgHtml()/applyPkg() at reference/orbi-portal-redesign.html
// lines 1683-1727 — plan grid -> confirm (with price/speed diff rows) -> changePackage().
export default function ChangePackageModal({ apartment, onDone }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()
  const { loading, plans, currentPlanId, error, retry } = usePlanCatalog(apartment)
  const [step, setStep] = useState('grid') // 'grid' | 'confirm'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  // Shadows mock/plans.js's planById on purpose — lookups must run against
  // whichever catalog (mock PLANS or real tariffs) this modal is showing.
  const planById = (id) => plans.find((p) => p.id === id)

  async function handleConfirm() {
    setSaving(true)
    try {
      const result = await changePackage(apartment.id, selected)
      const np = planById(selected)
      closeModal()
      toast(t('apartments:packageChangedToast', { plan: np.name, date: result.renewal }))
      onDone?.()
    } catch {
      toast(t('common:requestFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (step === 'confirm') {
    const cp = planById(currentPlanId)
    const np = planById(selected)
    const dMbps = np.mbps - (cp ? cp.mbps : 0)
    const dPrice = np.price - (cp ? cp.price : 0)

    const speedNode =
      dMbps > 0 ? (
        <span className={styles.diffUp}>{t('apartments:speedUp', { mbps: np.mbps, diff: dMbps })}</span>
      ) : dMbps < 0 ? (
        <span className={styles.diffDown}>{t('apartments:speedDown', { mbps: np.mbps, diff: Math.abs(dMbps) })}</span>
      ) : (
        <span className={styles.diffSame}>{t('apartments:speedSame', { mbps: np.mbps })}</span>
      )

    const priceNode =
      dPrice > 0 ? (
        <span className={styles.diffDown}>{t('apartments:priceIncreased', { price: fmt(np.price), diff: fmt(dPrice) })}</span>
      ) : dPrice < 0 ? (
        <span className={styles.diffUp}>{t('apartments:priceDecreased', { price: fmt(np.price), diff: fmt(-dPrice) })}</span>
      ) : (
        <span className={styles.diffSame}>{t('apartments:priceSame', { price: fmt(np.price) })}</span>
      )

    return (
      <>
        <div className={modalStyles['modal-head']}>
          <h3>{t('apartments:reviewPackageChange')}</h3>
          <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className={modalStyles['modal-body']}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px' }}>
            <Trans
              i18nKey="apartments:switchingIntro"
              values={{ from: cp ? cp.name : t('apartments:noActivePlan'), to: np.name }}
              components={{ b: <b style={{ color: 'var(--ink)' }} /> }}
            />
          </p>
          <div className={styles.compareBox}>
            <div className={styles.cmpRow}>
              <span style={{ color: 'var(--muted)' }}>{t('apartments:newMonthlyPrice')}</span>
              <span>{priceNode}</span>
            </div>
            <div className={styles.cmpRow}>
              <span style={{ color: 'var(--muted)' }}>{t('apartments:internetSpeedLabel')}</span>
              <span>{speedNode}</span>
            </div>
            <div className={styles.cmpRow}>
              <span style={{ color: 'var(--muted)' }}>{t('apartments:tvChannelsLabel')}</span>
              <span className={styles.diffSame}>{t('apartments:channelsSame', { ch: np.ch })}</span>
            </div>
          </div>
          <div className={styles.notice}>
            <Icon name="cal" />
            <Trans
              i18nKey="apartments:effectiveNotice"
              values={{ date: apartment.services.internet.renewal }}
              components={{ b: <b /> }}
            />
          </div>
        </div>
        <div className={modalStyles['modal-foot']}>
          <Button variant="ghost" onClick={() => setStep('grid')}>
            <Icon name="back" /> {t('common:back')}
          </Button>
          <Button disabled={saving} onClick={handleConfirm}>
            {t('apartments:confirm')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:changePackageModalTitle')}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
          <Trans i18nKey="apartments:choosePlanIntro" values={{ code: apartment.code }} components={{ b: <b style={{ color: 'var(--ink)' }} /> }} />
        </p>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} h={220} r={14} />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon="warn" title={t('common:requestFailed')}>
            <Button size="sm" variant="ghost" onClick={retry}>
              {t('common:retry')}
            </Button>
          </EmptyState>
        ) : (
        <div className={styles.grid}>
          {plans.map((p) => {
            const isCurrent = p.id === currentPlanId
            return (
              <div key={p.id} data-testid={`plan-card-${p.id}`} className={`${styles.plan} ${isCurrent ? styles.current : ''}`}>
                {isCurrent && (
                  <span className={styles.curBadge}>
                    <Chip>{t('apartments:currentPlanBadge')}</Chip>
                  </span>
                )}
                <div className={styles.info}>
                  <div className={styles.pname}>{p.name}</div>
                  <div className={styles.price}>{fmt(p.price)}</div>
                  <div className={styles.per}>{t('apartments:perMonth')}</div>
                </div>
                <div className={styles.divider} />
                <div className={styles.specs}>
                  <div className={styles.spec}>
                    <div className={styles.lab}>{t('apartments:internetSpecLabel')}</div>
                    <div className={styles.val}>{p.mbps} Mbps</div>
                  </div>
                  <div className={styles.spec}>
                    <div className={styles.lab}>{t('apartments:tvSpecLabel')}</div>
                    <div className={styles.val}>{p.ch} {t('apartments:channelsUnit')}</div>
                  </div>
                </div>
                <div className={styles.cta}>
                  {isCurrent ? (
                    <span className={styles.activeCta}>{t('apartments:active')}</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelected(p.id)
                        setStep('confirm')
                      }}
                    >
                      {t('apartments:change')}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>{t('common:cancel')}</Button>
      </div>
    </>
  )
}
