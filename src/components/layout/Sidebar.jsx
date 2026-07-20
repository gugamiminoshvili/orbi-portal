import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

function initials(fullname) {
  return (fullname || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const NAV = [
  { group: 'common:main', items: [
    { key: 'dashboard', icon: 'home', label: 'common:dashboard', to: '/dashboard' },
    { key: 'apartments', icon: 'building', label: 'common:myApartments', to: '/apartments' },
    { key: 'news', icon: 'doc', label: 'common:news', to: '/news' },
    // Placeholders (P3-6): not built yet, same disabled/"coming soon"
    // treatment as Finance's Invoices/Payments/Reports below.
    { key: 'bookingsVisits', icon: 'cal', label: 'common:bookingsVisits', disabled: true },
    { key: 'yourDevices', icon: 'door', label: 'common:yourDevices', disabled: true },
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
  const { user, mock, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

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
        {mock ? (
          <>
            <div className={styles.av}>GM</div>
            <div className={styles.nm}>
              Guga M.
              <small>Owner · 5 units</small>
            </div>
          </>
        ) : (
          <>
            <div className={styles.av}>{initials(user?.fullname)}</div>
            <div className={styles.nm}>
              {user?.fullname}
              <small>{t('common:owner')}</small>
            </div>
            <button
              type="button"
              className={styles.logoutBtn}
              aria-label={t('common:logout')}
              onClick={handleLogout}
            >
              <Icon name="logout" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

export { NAV }
