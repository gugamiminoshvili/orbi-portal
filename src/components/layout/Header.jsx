import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import Breadcrumbs from './Breadcrumbs'
import { setLang } from '../../i18n'
import styles from './Header.module.css'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ka', label: 'ქარ' },
  { code: 'ru', label: 'РУС' },
]

export default function Header({ crumbs, onBurger }) {
  const { t, i18n } = useTranslation()

  return (
    <header className={styles.header}>
      <button className={styles.burger} aria-label={t('common:ariaOpenMenu')} onClick={onBurger}>
        ☰
      </button>
      <Breadcrumbs items={crumbs} />
      <div className={styles.spacer} />
      <div className={styles['h-search']}>
        <Icon name="search" />
        <input type="search" placeholder={t('common:search')} aria-label={t('common:search')} />
      </div>
      <div className={styles['lang-switch']} role="group" aria-label={t('common:ariaLanguage')}>
        {LANGS.map((lang) => (
          <button
            key={lang.code}
            className={i18n.language === lang.code ? styles.on : ''}
            onClick={() => setLang(lang.code)}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <button className={styles['icon-btn']} aria-label={t('common:ariaNotifications')}>
        <span className={styles.dot} />
        🔔
      </button>
      <button className={`${styles['icon-btn']} ${styles['hide-sm']}`} aria-label={t('common:ariaHelp')}>
        ?
      </button>
    </header>
  )
}
