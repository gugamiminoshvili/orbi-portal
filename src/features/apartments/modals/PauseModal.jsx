import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { pauseInternet } from '../../../api/endpoints/apartments'
import { flatId } from '../../../api/adapters/apartments'
import { fmt } from '../../../utils/format'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import modalStyles from '../../../context/Modal.module.css'
import detailStyles from '../Detail.module.css'

// Ported from openPause()/applyPause() at reference/orbi-portal-redesign.html
// lines 1756-1766 — warn box + pause fee -> pauseInternet().
export default function PauseModal({ apartment, onDone }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  async function handlePause() {
    setSaving(true)
    try {
      const result = await pauseInternet(flatId(apartment))
      closeModal()
      toast(t('apartments:pausedToast', { fee: fmt(result.tariff) }))
      onDone?.()
    } catch {
      toast(t('common:requestFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:pauseModalTitle')}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <div className={detailStyles['warn-box']}>
          <div className={detailStyles.wi}>
            <Icon name="warn" />
          </div>
          <div>
            <h4>{t('apartments:pauseWarnTitle')}</h4>
            <p>
              <Trans i18nKey="apartments:pauseWarnBody" values={{ fee: fmt(6) }} components={{ b: <b /> }} />
            </p>
          </div>
        </div>
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>{t('common:cancel')}</Button>
        <Button variant="warn" disabled={saving} onClick={handlePause}>
          <Icon name="pause" /> {t('apartments:pauseServiceBtn')}
        </Button>
      </div>
    </>
  )
}
