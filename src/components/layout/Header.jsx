import { useTranslation } from 'react-i18next'
import Breadcrumbs from './Breadcrumbs'
import UserMenu from './UserMenu'
import Icon from '../ui/Icon'
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
      {/* Owner calls 2026-08-04: language moved into UserMenu, and the help
          "?" button is gone — the sidebar's own Help & guides footer covers
          it. The header is the bell plus the account cluster. */}
      <button className={styles['icon-btn']} aria-label={t('common:ariaNotifications')}>
        <span className={styles.dot} />
        <Icon name="bell" />
      </button>
      <UserMenu />
    </header>
  )
}
