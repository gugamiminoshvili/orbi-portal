import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../context/NotificationsContext'
import NotificationRow from '../../features/notifications/NotificationRow'
import Icon from '../ui/Icon'
import Skeleton from '../ui/Skeleton'
import styles from './NotificationsMenu.module.css'
import headerStyles from './Header.module.css'

// How many rows the panel shows before it stops being a panel. The rest live
// on /notifications, which the panel's own footer links to.
const PANEL_MAX = 8

// The header bell. Opening the panel does NOT mark anything read — the owner
// call was that reading a row is what marks it, with one explicit button for
// the whole list.
export default function NotificationsMenu() {
  const { t } = useTranslation()
  const { items, unread, loading, markAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shown = items.slice(0, PANEL_MAX)

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={headerStyles['icon-btn']}
        aria-label={t('common:ariaNotifications')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        data-bell
      >
        {/* The dot is the count's shadow, not a decoration: it appears only
            while something is actually unread. */}
        {unread > 0 && <span className={headerStyles.dot} data-unread={unread} />}
        <Icon name="bell" />
      </button>

      {open && (
        <div className={styles.panel} role="menu" data-panel>
          <div className={styles.head}>
            <h3>{t('notifications:title')}</h3>
            {unread > 0 && (
              <button type="button" className={styles.mark} onClick={markAll}>
                <Icon name="check" /> {t('notifications:markAll')}
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading && items.length === 0 ? (
              <div className={styles.loading}>
                <Skeleton h={54} r={10} />
                <Skeleton h={54} r={10} />
                <Skeleton h={54} r={10} />
              </div>
            ) : shown.length === 0 ? (
              <div className={styles.empty}>
                <Icon name="bell" />
                <b>{t('notifications:emptyTitle')}</b>
                <span>{t('notifications:emptyBody')}</span>
              </div>
            ) : (
              shown.map((n) => (
                <NotificationRow key={n.id} item={n} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>

          <Link to="/notifications" className={styles.all} onClick={() => setOpen(false)}>
            {t('notifications:viewAll')} <Icon name="chevron-right" size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
