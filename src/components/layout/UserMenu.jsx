import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { accountStatus, needsAttention, STATUS_TONE } from '../../utils/accountStatus'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import styles from './UserMenu.module.css'

function initials(fullname) {
  return (fullname || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Header account cluster: avatar + greeting + (attention-only) status badge,
// opening a menu with the profile links and sign-out.
export default function UserMenu() {
  const { t } = useTranslation()
  const { user, logout, mock } = useAuth()
  const navigate = useNavigate()
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

  const name = user?.fullname || user?.username || ''
  const firstName = name.split(' ').filter(Boolean)[0] || name
  const status = accountStatus(user)
  // The header pill and the menu head are narrow, so they use the short label
  // where one exists ("Pending" rather than "Pending verification") — a badge
  // is a fixed-height chip and must never wrap. The profile page's status card
  // has the room for the full wording.
  const shortStatusLabel = t([`profile:status.${status}Short`, `profile:status.${status}`])

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.greet}>
          {t('common:greeting')} <b>{firstName}</b>
        </span>
        {/* Owner call: a verified account isn't badged in the header — only a
            status that needs attention is surfaced here. The profile page
            shows the status either way. */}
        {needsAttention(status) && (
          <Badge tone={STATUS_TONE[status]} className={styles.badge}>
            {shortStatusLabel}
          </Badge>
        )}
        <span className={styles.avatar}>{initials(name)}</span>
        <Icon name="chevron" className={styles.chev} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.head}>
            <span className={styles['avatar-lg']}>{initials(name)}</span>
            <div className={styles['head-body']}>
              <div className={styles['head-name']}>{name}</div>
              {/* Same rule as the trigger badge (owner call): the menu head
                  only mentions the status when it needs attention. A healthy
                  account shows the email instead of a redundant "verified". */}
              {needsAttention(status) ? (
                <div className={styles['head-status']}>
                  <Badge tone={STATUS_TONE[status]}>{shortStatusLabel}</Badge>
                </div>
              ) : (
                user?.mail && <div className={styles['head-mail']}>{user.mail}</div>
              )}
            </div>
          </div>
          <Link to="/profile" role="menuitem" className={styles.item} onClick={() => setOpen(false)}>
            <Icon name="user" /> {t('profile:myProfile')}
          </Link>
          <Link
            to="/profile?tab=security"
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            <Icon name="lock" /> {t('profile:security')}
          </Link>
          {!mock && (
            <>
              <div className={styles.sep} />
              <button type="button" role="menuitem" className={`${styles.item} ${styles.danger}`} onClick={handleLogout}>
                <Icon name="logout" /> {t('common:logout')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
