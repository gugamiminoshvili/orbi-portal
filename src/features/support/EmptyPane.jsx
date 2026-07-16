import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Support.module.css'

// Detail-pane placeholder shown at the /support index route (no ticket
// selected yet) and reused by TicketChatPane for an unknown ticket id.
// Mirrors supEmptyHtml() at reference lines 1897-1902.
export default function EmptyPane({ title, message, showNew = true }) {
  const { t } = useTranslation()
  return (
    <div className={styles['sup-empty']}>
      <div className={styles.ei}>
        <Icon name="chat" size={28} />
      </div>
      <h3>{title ?? t('support:emptyTitle')}</h3>
      <p>{message ?? t('support:emptyMessage')}</p>
      {showNew && (
        <Link
          to="/support/new"
          className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}
        >
          <Icon name="plus" /> {t('support:newTicket')}
        </Link>
      )}
    </div>
  )
}
