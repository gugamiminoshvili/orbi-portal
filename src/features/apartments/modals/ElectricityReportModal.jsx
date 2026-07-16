import { useEffect, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import Field, { Input } from '../../../components/ui/Field'
import modalStyles from '../../../context/Modal.module.css'

const GENERATE_MS = 1600

// Ported from openElecModal()/elecHtml() at reference/orbi-portal-redesign.html
// lines 1605-1627 — form -> generating (modal locked, no close) -> ready.
// Read-only — no mutation, so `onDone` is accepted for interface parity but
// never called.
export default function ElectricityReportModal({ apartment }) {
  const { t } = useTranslation()
  const { closeModal, setModalLocked } = useModal()
  const toast = useToast()
  const s = apartment.services.electricity

  const [step, setStep] = useState('form') // 'form' | 'generating' | 'ready'
  const [type, setType] = useState(null) // 'daily' | 'monthly'
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setModalLocked(false)
  }, [setModalLocked])

  function generate(nextType) {
    setType(nextType)
    setStep('generating')
    setModalLocked(true)
    timerRef.current = setTimeout(() => {
      setStep('ready')
      setModalLocked(false)
    }, GENERATE_MS)
  }

  const typeLabel = type ? t(`apartments:reportType${type === 'daily' ? 'Daily' : 'Monthly'}`) : ''

  if (step === 'generating') {
    return (
      <>
        <div className={modalStyles['modal-head']}>
          <h3>{t('apartments:generatingReportTitle', { type: typeLabel })}</h3>
          <button type="button" className={modalStyles['modal-x']} disabled style={{ opacity: 0.4 }} aria-label={t('common:close')}>
            ✕
          </button>
        </div>
        <div className={modalStyles['modal-body']} style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 18 }}>
            {t('apartments:generatingReportBody', { type: typeLabel, counter: s.counter })}
          </p>
        </div>
      </>
    )
  }

  if (step === 'ready') {
    return (
      <>
        <div className={modalStyles['modal-head']}>
          <h3>{t('apartments:reportReadyTitle')}</h3>
          <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className={modalStyles['modal-body']} style={{ textAlign: 'center' }}>
          <Icon name="doc" size={40} />
          <h3 style={{ margin: '10px 0 6px' }}>{t('apartments:reportGeneratedTitle', { type: typeLabel })}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            {t('apartments:reportGeneratedBody', { counter: s.counter })}
          </p>
        </div>
        <div className={modalStyles['modal-foot']}>
          <Button variant="ghost" onClick={() => setStep('form')}>
            <Icon name="back" /> {t('apartments:newReport')}
          </Button>
          <Button
            onClick={() => {
              toast(t('apartments:reportDownloadedToast', { type: typeLabel }))
              closeModal()
            }}
          >
            <Icon name="dl" /> {t('apartments:downloadPdf')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:electricityReportsModalTitle')}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
          <Trans i18nKey="apartments:electricityReportsIntro" values={{ counter: s.counter }} components={{ b: <b style={{ color: 'var(--ink)' }} /> }} />
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label={t('common:from')} htmlFor="elFrom" style={{ flex: 1, minWidth: 140 }}>
            <Input id="elFrom" type="date" defaultValue="2026-05-01" />
          </Field>
          <Field label={t('common:to')} htmlFor="elTo" style={{ flex: 1, minWidth: 140 }}>
            <Input id="elTo" type="date" defaultValue="2026-06-01" />
          </Field>
        </div>
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={() => generate('daily')}>
          <Icon name="dl" /> {t('apartments:dailyReport')}
        </Button>
        <Button onClick={() => generate('monthly')}>
          <Icon name="dl" /> {t('apartments:monthlyReport')}
        </Button>
      </div>
    </>
  )
}
