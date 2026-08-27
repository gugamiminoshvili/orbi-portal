import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import logo from '../../assets/orbi-logo.svg'
import styles from './Sidebar.module.css'

const NAV = [
  { group: 'common:main', items: [
    { key: 'dashboard', icon: 'home', label: 'common:dashboard', to: '/dashboard' },
    { key: 'apartments', icon: 'building', label: 'common:myApartments', to: '/apartments' },
    { key: 'news', icon: 'doc', label: 'common:news', to: '/news' },
    // Owner call 2026-08-07: back in the rail, now as a real route. The page
    // itself is an empty shell until the module is specified.
    { key: 'bookingsVisits', icon: 'cal', label: 'common:bookingsVisits', to: '/bookings' },
  ] },
  // Its own group with a single row (owner call 2026-08-07). The group is
  // "Support" — the place — and the row is "Chat" — the thing you do there;
  // the old Account group (Settings + Support) is gone, and Your Devices
  // moved into the account menu beside the other personal settings.
  { group: 'common:support', items: [
    { key: 'chat', icon: 'chat', label: 'common:chat', to: '/support' },
  ] },
  // The company's process rules, added at the owner's request (2026-07-30) as
  // their own group rather than as one "Guides" index entry — four rules is a
  // short, stable list, and one click beats two.
  { group: 'common:guides', items: [
    { key: 'guideHandover', icon: 'building', label: 'common:guideHandover', to: '/guides/handover' },
    { key: 'guidePowerOfAttorney', icon: 'doc', label: 'common:guidePowerOfAttorney', to: '/guides/power-of-attorney' },
    { key: 'guideService', icon: 'wrench', label: 'common:guideService', to: '/guides/service' },
    { key: 'guideContactCentre', icon: 'chat', label: 'common:guideContactCentre', to: '/guides/contact-centre' },
    // Appended rather than slotted in at the top: the four above are an
    // order the owner already approved, and this is a document library
    // rather than another process rule.
    { key: 'rules', icon: 'doc', label: 'rules:title', to: '/rules' },
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
        {/* The real mark, not a lettered tile. alt is empty because the
            wordmark beside it already says ORBI — a screen reader that read
            both would say it twice. */}
        <img src={logo} alt="" className={styles.logo} />
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
