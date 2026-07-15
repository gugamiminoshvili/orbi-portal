import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import styles from './Sidebar.module.css'

const NAV = [
  { group: 'common:main', items: [
    { key: 'dashboard', icon: 'home', label: 'common:dashboard', disabled: true },
    { key: 'apartments', icon: 'building', label: 'common:myApartments', to: '/apartments' },
    { key: 'news', icon: 'doc', label: 'common:news', to: '/news' },
  ] },
  { group: 'common:finance', items: [
    { key: 'invoices', icon: 'doc', label: 'common:invoices', disabled: true },
    { key: 'payments', icon: 'swap', label: 'common:payments', disabled: true },
    { key: 'reports', icon: 'doc', label: 'common:reports', disabled: true },
  ] },
  { group: 'common:account', items: [
    { key: 'settings', icon: 'dots', label: 'common:settings', disabled: true },
    { key: 'support', icon: 'chat', label: 'common:support', to: '/support' },
  ] },
]

export default function Sidebar({ open, onNavigate }) {
  const { t } = useTranslation()

  return (
    <aside
      className={`${styles.sidebar} ${open ? styles.open : ''}`}
      aria-label={t('common:ariaMainNav')}
    >
      <div className={styles.brand}>
        <div className={styles.logo}>O</div>
        <div>
          <b>ORBI</b>
          <span>{t('common:ownerPortal')}</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV.map((group) => (
          <div key={group.group}>
            <div className={styles.group}>{t(group.group)}</div>
            {group.items.map((item) =>
              item.disabled ? (
                <span
                  key={item.key}
                  className={styles.navItem}
                  aria-disabled="true"
                  title={t('common:comingSoon')}
                >
                  <Icon name={item.icon} className={styles.ic} />
                  {t(item.label)}
                </span>
              ) : (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon name={item.icon} className={styles.ic} />
                  {t(item.label)}
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>
      <div className={styles['side-foot']}>
        <div className={styles.av}>GM</div>
        <div className={styles.nm}>
          Guga M.
          <small>Owner · 5 units</small>
        </div>
      </div>
    </aside>
  )
}

export { NAV }
