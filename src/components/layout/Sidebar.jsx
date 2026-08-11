import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import styles from './Sidebar.module.css'

const NAV = [
  { group: 'common:main', items: [
    { key: 'dashboard', icon: 'home', label: 'common:dashboard', to: '/dashboard' },
    { key: 'apartments', icon: 'building', label: 'common:myApartments', to: '/apartments' },
    { key: 'news', icon: 'doc', label: 'common:news', to: '/news' },
    // Placeholder (P3-6): not built yet, same disabled/"coming soon" treatment.
    { key: 'yourDevices', icon: 'door', label: 'common:yourDevices', disabled: true },
    // TEMPORARILY HIDDEN (owner request, 2026-07-21): "Bookings and Visits"
    // and the whole Finance group (Invoices/Payments/Reports) are removed
    // until their forms are ready — service info, handover, additional
    // services, and internal regulations go here later. Restore by
    // uncommenting when the backing pages exist.
    // { key: 'bookingsVisits', icon: 'cal', label: 'common:bookingsVisits', disabled: true },
  ] },
  // { group: 'common:finance', items: [
  //   { key: 'invoices', icon: 'doc', label: 'common:invoices', disabled: true },
  //   { key: 'payments', icon: 'swap', label: 'common:payments', disabled: true },
  //   { key: 'reports', icon: 'doc', label: 'common:reports', disabled: true },
  // ] },
  // The company's process rules, added at the owner's request (2026-07-30) as
  // their own group rather than as one "Guides" index entry — four rules is a
  // short, stable list, and one click beats two.
  { group: 'common:guides', items: [
    { key: 'guideHandover', icon: 'building', label: 'common:guideHandover', to: '/guides/handover' },
    { key: 'guidePowerOfAttorney', icon: 'doc', label: 'common:guidePowerOfAttorney', to: '/guides/power-of-attorney' },
    { key: 'guideService', icon: 'wrench', label: 'common:guideService', to: '/guides/service' },
    { key: 'guideContactCentre', icon: 'chat', label: 'common:guideContactCentre', to: '/guides/contact-centre' },
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
      {/* The identity/sign-out footer was removed: the header account menu
          (UserMenu) is the single place the signed-in user is shown. The
          rail's bottom slack now carries a route into Support instead. */}
      <div className={styles['side-foot']}>
        <NavLink to="/support" onClick={onNavigate} className={styles.help}>
          <Icon name="help" />
          {t('common:helpAndGuides')}
        </NavLink>
      </div>
    </aside>
  )
}

export { NAV }
