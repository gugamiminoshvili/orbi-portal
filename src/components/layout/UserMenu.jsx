import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { LANGS, setLang } from '../../i18n'
import { accountStatus, needsAttention, STATUS_TONE } from '../../utils/accountStatus'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import { SwitchVisual } from '../ui/Switch'
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

// Header account cluster: avatar + name, opening the menu that holds the
// profile links, the language switch, the dark-mode toggle and sign-out.
//
// Language used to be its own header control; it moved in here (owner call
// 2026-08-04) so the header carries one account affordance instead of two.
// It keeps the two-pane shape it had as a standalone menu — a root row that
// opens a list — rather than inlining three flags into the account menu.
export default function UserMenu() {
  const { t, i18n } = useTranslation()
  const { user, logout, mock } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // 'root' | 'lang' — which pane of the menu is showing.
  const [view, setView] = useState('root')
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

  // Reopening always lands on the root pane — the language list is a detour,
  // not somewhere the menu should remember having been.
  useEffect(() => {
    if (!open) setView('root')
  }, [open])

  const name = user?.fullname || user?.username || ''
  const status = accountStatus(user)
  const dark = theme === 'dark'
  const currentLang = LANGS.find((l) => l.code === i18n.language) || LANGS[0]
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
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.name}>{name}</span>
        {/* Owner call: a verified account isn't badged in the header — only a
            status that needs attention is surfaced here. The profile page
            shows the status either way. */}
        {needsAttention(status) && (
          <Badge tone={STATUS_TONE[status]} className={styles.badge}>
            {shortStatusLabel}
          </Badge>
        )}
        <Icon name="chevron" className={styles.chev} />
      </button>

      {open && view === 'root' && (
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

          <div className={styles.sep} />

          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            className={styles.item}
            onClick={() => setView('lang')}
          >
            <Icon name="globe" />
            <span className={styles.label}>{t('common:language')}</span>
            <span className={styles.trail}>{currentLang.label}</span>
            <Icon name="chevron-right" className={styles.more} />
          </button>

          {/* menuitemcheckbox, not a nested <Switch>: the row is the hit
              target and already carries the state, so the toggle beside it
              is a picture of that state (see SwitchVisual). */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={dark}
            className={styles.item}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            <Icon name="moon" />
            <span className={styles.label}>{t('common:darkMode')}</span>
            <SwitchVisual checked={dark} />
          </button>

          {!mock && (
            <>
              <div className={styles.sep} />
              <button
                type="button"
                role="menuitem"
                className={`${styles.item} ${styles.danger}`}
                onClick={handleLogout}
              >
                {/* The back arrow, not the door-with-arrow `logout` glyph —
                    matches the reference the owner supplied. */}
                <Icon name="back" /> {t('common:logout')}
              </button>
            </>
          )}
        </div>
      )}

      {open && view === 'lang' && (
        <div className={styles.menu} role="menu" aria-label={t('common:changeLanguage')}>
          <div className={styles['pane-head']}>
            <button
              type="button"
              className={styles.backbtn}
              aria-label={t('common:back')}
              onClick={() => setView('root')}
            >
              <Icon name="back" />
            </button>
            <span>{t('common:changeLanguage')}</span>
          </div>
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang.code === currentLang.code}
              className={`${styles.item} ${lang.code === currentLang.code ? styles.on : ''}`}
              onClick={() => {
                setLang(lang.code)
                setOpen(false)
              }}
            >
              <span className={styles.flag}>{lang.flag}</span>
              <span className={styles.label}>{lang.label}</span>
              {lang.code === currentLang.code && (
                <Icon name="check" size={15} className={styles.tick} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
