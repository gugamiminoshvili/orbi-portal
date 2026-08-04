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
      {/* Language moved into UserMenu (owner call 2026-08-04) — the header
          keeps only the two notice controls and the account cluster. */}
      <button className={styles['icon-btn']} aria-label={t('common:ariaNotifications')}>
        <span className={styles.dot} />
        <Icon name="bell" />
      </button>
      <button className={`${styles['icon-btn']} ${styles['hide-sm']}`} aria-label={t('common:ariaHelp')}>
        <Icon name="help" />
      </button>
      <UserMenu />
    </header>
  )
}
