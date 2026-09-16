import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../context/NotificationsContext'
import Icon from '../../components/ui/Icon'
import { metaFor, relativeTime, routeFor } from './notificationMeta'
import styles from './Notifications.module.css'

// One row, shared by the bell panel and the page. A row with a destination
// is a link; a row without one is a plain block that still marks itself read
// when clicked — the same gesture, so the reader does not have to learn
// which rows are which.
export default function NotificationRow({ item, onNavigate }) {
  const { t, i18n } = useTranslation()
  const { markOne } = useNotifications()
  const { icon, tone } = metaFor(item)
  const to = routeFor(item)

  const body = (
    <>
      <span className={`${styles['row-ic']} ${styles[tone]}`}>
        <Icon name={icon} />
      </span>
      <span className={styles['row-body']}>
        <span className={styles['row-msg']}>{item.msg || t('notifications:untitled')}</span>
        {item.note && item.note !== item.msg && (
          <span className={styles['row-note']}>{item.note}</span>
        )}
        <span className={styles['row-time']}>{relativeTime(item.at, i18n.language)}</span>
      </span>
      {/* The unread marker is a dot AND the row's weight — never colour
          alone, and the aria-label says it in words. */}
      {!item.seen && (
        <span className={styles['row-dot']} aria-label={t('notifications:unread')} role="img" />
      )}
    </>
  )

  const handle = () => {
    if (!item.seen) markOne(item.id)
    if (onNavigate) onNavigate()
  }

  const className = `${styles.row} ${item.seen ? '' : styles.new}`

  return to ? (
    <Link to={to} className={className} data-notification={item.id} onClick={handle}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} data-notification={item.id} onClick={handle}>
      {body}
    </button>
  )
}
