import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { REASONS, whatsappLink } from './reasons'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Verification.module.css'

// What a blocked owner sees. One dialog, several faces — the reason decides
// the tone, the glyph, the wording and which action is offered first.
//
// Built to the approved prototype (orbi-passport-verification-v2-refined):
// no title bar, the close button floats over the body, and the actions are a
// full-width column with the primary on top. The two labels come from the
// state's own `buttons` array, in the same order as its `actions` — so
// "Contact support" can be the ghost under "Re-upload photo" for one reason
// and the primary for another.
export default function VerificationModal({ reason = 'generic' }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const def = REASONS[reason] || REASONS.generic
  const items = t(`verification:reasons.${reason}.items`, { returnObjects: true })
  const labels = t(`verification:reasons.${reason}.buttons`, { returnObjects: true })

  function actionProps(act) {
    if (act === 'support') {
      return {
        as: 'a',
        href: whatsappLink(t('verification:waMessage')),
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    }
    if (act === 'upload') return { as: 'a', href: '/profile', onClick: closeModal }
    return { as: 'button', type: 'button', onClick: closeModal }
  }

  return (
    <div className={`${styles.dialog} ${styles[def.tone]}`}>
      <button
        type="button"
        className={styles.close}
        aria-label={t('common:close')}
        onClick={closeModal}
      >
        <Icon name="close" />
      </button>

      <div className={styles.body}>
        <span className={styles.icon}>
          <Icon name={def.icon} />
        </span>
        <h3 className={styles.title}>{t(`verification:reasons.${reason}.title`)}</h3>
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

      <div className={styles.foot}>
        {def.actions.map((a, i) => {
          const { as: As, ...rest } = actionProps(a.act)
          const variant = i === 0 ? buttonStyles['btn-primary'] : buttonStyles['btn-ghost']
          return (
            <As key={a.act} className={`${buttonStyles.btn} ${variant} ${styles.act}`} {...rest}>
              {a.icon && <Icon name={a.icon} />}
              {Array.isArray(labels) ? labels[i] : ''}
            </As>
          )
        })}
      </div>
    </div>
  )
}
