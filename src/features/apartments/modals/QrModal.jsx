import { useTranslation } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { qrSvg } from '../../../utils/placeholder'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import modalStyles from '../../../context/Modal.module.css'

// Ported from openQr() at reference/orbi-portal-redesign.html lines 1597-1602.
// Read-only — no mutation, so `onDone` is accepted for interface parity with
// the other modals but never called.
export default function QrModal({ apartment }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:qrModalTitle', { code: apartment.code })}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']} style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 240,
            height: 240,
            margin: '0 auto',
            border: '1px solid var(--line-2)',
            borderRadius: 14,
            padding: 14,
            // Literally white, not --card: the padding is the QR's quiet zone,
            // and a scanner needs it light in either theme.
            background: '#fff',
          }}
          dangerouslySetInnerHTML={{ __html: qrSvg(apartment.apCode) }}
        />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>
          {t('apartments:apCode')}: <b style={{ color: 'var(--ink)' }}>{apartment.apCode}</b>
        </p>
        <Button
          variant="ghost"
          size="sm"
          style={{ marginTop: 8 }}
          onClick={() => toast(t('apartments:qrDownloadedToast'))}
        >
          <Icon name="dl" /> {t('apartments:downloadQr')}
        </Button>
      </div>
    </>
  )
}
