import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { REASONS, whatsappLink } from './reasons'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import modalStyles from '../../context/Modal.module.css'
import styles from './Verification.module.css'

// What a blocked owner sees. One dialog, five faces — the reason decides the
// icon, the tone, the wording and which action is offered first.
export default function VerificationModal({ reason = 'generic' }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const def = REASONS[reason] || REASONS.generic
  const items = t(`verification:reasons.${reason}.items`, { returnObjects: true })

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('verification:modalTitle')}</h3>
        <button
          type="button"
          className={modalStyles['modal-x']}
          aria-label={t('common:close')}
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <div className={`${modalStyles['modal-body']} ${styles.body} ${styles[def.tone]}`}>
        <span className={styles.icon}>
          <Icon name={def.icon} />
        </span>
        <h4 className={styles.title}>{t(`verification:reasons.${reason}.title`)}</h4>
        <p className={styles.desc}>{t(`verification:reasons.${reason}.desc`)}</p>

        {Array.isArray(items) && items.length > 0 && (
          <div className={styles.list}>
            <div className={styles['list-t']}>{t(`verification:reasons.${reason}.listTitle`)}</div>
            <ul>
              {items.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>
          {t('verification:later')}
        </Button>
        {/* Only ever one primary action, and it is the one that can actually
            resolve this particular reason. */}
        {def.action === 'upload' ? (
          <Button as="a" href="/register" onClick={closeModal}>
            <Icon name="dl" /> {t('verification:uploadAgain')}
          </Button>
        ) : (
          <Button
            as="a"
            href={whatsappLink(t('verification:waMessage'))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="chat" /> {t('verification:contactSupport')}
          </Button>
        )}
      </div>
    </>
  )
}
