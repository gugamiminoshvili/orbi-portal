import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { USE_MOCK } from '../../../api/client'
import { activateBoost, getTariffs } from '../../../api/endpoints/apartments'
import { BOOSTS } from '../../../api/mock/plans'
import { fmt } from '../../../utils/format'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import EmptyState from '../../../components/ui/EmptyState'
import Skeleton from '../../../components/ui/Skeleton'
import modalStyles from '../../../context/Modal.module.css'

// Real-mode data source: the boost catalog comes from GET /internettv/tariff/
// (getTariffs) — offering the static mock BOOSTS ids to a real backend would
// POST ids the API has never heard of. Mock mode keeps the static BOOSTS
// import exactly as before.
function useBoostCatalog() {
  const [state, setState] = useState(() =>
    USE_MOCK ? { loading: false, boosts: BOOSTS } : { loading: true, boosts: [] }
  )

  useEffect(() => {
    if (USE_MOCK) return undefined
    let cancelled = false
    getTariffs().then((tariffs) => {
      if (cancelled) return
      setState({ loading: false, boosts: tariffs.boosts })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

// Ported from openBoost()/boostHtml()/applyBoost() at
// reference/orbi-portal-redesign.html lines 1730-1754 — select boost -> confirm -> activateBoost().
export default function BoostModal({ apartment, onDone }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()
  const active = apartment.services.internet.boost
  const { loading, boosts } = useBoostCatalog()
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedBoost = boosts.find((b) => b.id === selected)

  async function handleActivate() {
    setSaving(true)
    await activateBoost(apartment.id, selected)
    closeModal()
    toast(t('apartments:boostActivatedToast', { name: selectedBoost.name, amount: fmt(selectedBoost.price) }))
    onDone?.()
  }

  if (confirming && selectedBoost) {
    return (
      <>
        <div className={modalStyles['modal-head']}>
          <h3>{t('apartments:confirmBoostTitle')}</h3>
          <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className={modalStyles['modal-body']}>
          <p style={{ fontSize: 14, margin: '0 0 10px' }}>
            <Trans
              i18nKey="apartments:confirmBoostBody"
              values={{ name: selectedBoost.name, speed: selectedBoost.speed, duration: selectedBoost.duration }}
              components={{ b: <b /> }}
            />
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            <Trans
              i18nKey="apartments:boostChargeNotice"
              values={{ amount: fmt(selectedBoost.price) }}
              components={{ b: <b style={{ color: 'var(--ink)' }} /> }}
            />
          </p>
        </div>
        <div className={modalStyles['modal-foot']}>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            <Icon name="back" /> {t('common:back')}
          </Button>
          <Button disabled={saving} onClick={handleActivate}>
            {t('apartments:chargeAndActivate', { amount: fmt(selectedBoost.price) })}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:boostManagementTitle')}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 10px' }}>
          {t('apartments:currentActiveBoostLabel')}
        </div>
        {active ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid var(--teal)',
              background: '#f3fdfc', borderRadius: 12, padding: '14px 16px', marginBottom: 14,
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--teal-soft)', color: 'var(--teal-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icon name="rocket" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{active.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {t('apartments:boostRemaining', { speed: active.speed, duration: active.duration })}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon="rocket" title={t('apartments:noActiveBoostTitle')} style={{ marginBottom: 14 }}>
            <p>{t('apartments:noActiveBoostBody')}</p>
          </EmptyState>
        )}
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted)', margin: '18px 0 10px' }}>
          {t('apartments:availableBoostsLabel')}
        </div>
        {loading && (
          <>
            <Skeleton h={72} r={12} style={{ marginBottom: 10 }} />
            <Skeleton h={72} r={12} style={{ marginBottom: 10 }} />
          </>
        )}
        {!loading && boosts.map((b) => {
          const sel = selected === b.id
          return (
            <button
              type="button"
              key={b.id}
              onClick={() => setSelected(b.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                border: `1.5px solid ${sel ? 'var(--teal)' : 'var(--line-2)'}`,
                background: sel ? '#f3fdfc' : '#fff',
                borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--teal-soft)', color: 'var(--teal-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name="rocket" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('apartments:boostSub', { speed: b.speed, duration: b.duration })}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{fmt(b.price)}</div>
              <div
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: `2px solid ${sel ? 'var(--teal)' : 'var(--line-2)'}`,
                  background: sel ? 'var(--teal)' : 'transparent', display: 'grid', placeItems: 'center', flex: 'none', color: '#fff',
                }}
              >
                {sel && <Icon name="check" size={12} />}
              </div>
            </button>
          )
        })}
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>{t('common:cancel')}</Button>
        <Button disabled={!selected} onClick={() => setConfirming(true)}>
          {selected ? t('apartments:activateAmount', { amount: fmt(selectedBoost.price) }) : t('apartments:activateNow')}
        </Button>
      </div>
    </>
  )
}
