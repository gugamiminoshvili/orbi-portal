import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import { setLang } from '../../i18n'
import styles from './LangMenu.module.css'

// Flags are emoji rather than image assets — no external requests, and they
// inherit the surrounding type metrics.
const LANGS = [
  { code: 'en', flag: '🇬🇧', label: 'English', short: 'EN' },
  { code: 'ka', flag: '🇬🇪', label: 'ქართული', short: 'ქარ' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', short: 'РУС' },
]

export default function LangMenu() {
  const { t, i18n } = useTranslation()
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

  const current = LANGS.find((l) => l.code === i18n.language) || LANGS[0]

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        aria-label={t('common:ariaLanguage')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.flag}>{current.flag}</span>
        <Icon name="chevron" className={styles.chev} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitem"
              className={`${styles.item} ${lang.code === current.code ? styles.on : ''}`}
              onClick={() => {
                setLang(lang.code)
                setOpen(false)
              }}
            >
              <span className={styles.flag}>{lang.flag}</span>
              <span className={styles.label}>{lang.label}</span>
              <span className={styles.short}>{lang.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { LANGS }
