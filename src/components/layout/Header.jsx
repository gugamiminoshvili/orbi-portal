import { useTranslation } from 'react-i18next'
import Breadcrumbs from './Breadcrumbs'
import LangMenu from './LangMenu'
import UserMenu from './UserMenu'
import styles from './Header.module.css'

export default function Header({ crumbs, onBurger }) {
  const { t } = useTranslation()

  return (
    <header className={styles.header}>
      <button className={styles.burger} aria-label={t('common:ariaOpenMenu')} onClick={onBurger}>
        ☰
      </button>
      <Breadcrumbs items={crumbs} />
      <div className={styles.spacer} />
      <LangMenu />
      <button className={styles['icon-btn']} aria-label={t('common:ariaNotifications')}>
        <span className={styles.dot} />
        🔔
      </button>
      <button className={`${styles['icon-btn']} ${styles['hide-sm']}`} aria-label={t('common:ariaHelp')}>
        ?
      </button>
      <UserMenu />
    </header>
  )
}
