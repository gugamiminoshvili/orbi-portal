import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Header from './Header'
import ScrollToTop from './ScrollToTop'
import styles from './AppShell.module.css'

const BreadcrumbsContext = createContext(null)

// Lets feature pages set the breadcrumb trail shown in the Header.
// Usage: useCrumbs([{ label: 'News' }, { label: title }])
export function useCrumbs(items) {
  const setCrumbs = useContext(BreadcrumbsContext)
  const key = JSON.stringify(items)
  useEffect(() => {
    if (setCrumbs) setCrumbs(JSON.parse(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCrumbs, key])
}

export function AppShell() {
  const { t } = useTranslation()
  // null = no feature page has overridden the crumbs yet, so fall back to a
  // "Home" crumb that stays reactive to language changes.
  const [customCrumbs, setCrumbs] = useState(null)
  const [open, setOpen] = useState(false)

  const closeSidebar = useCallback(() => setOpen(false), [])
  const toggleSidebar = useCallback(() => setOpen((o) => !o), [])

  const crumbs = customCrumbs ?? [{ label: t('common:home') }]

  return (
    <BreadcrumbsContext.Provider value={setCrumbs}>
      <ScrollToTop />
      <div className={styles.app}>
        <Sidebar open={open} onNavigate={closeSidebar} />
        <div
          className={`${styles.scrim} ${open ? styles.show : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
        <div className={styles.main}>
          <Header crumbs={crumbs} onBurger={toggleSidebar} />
          <main className={styles.page} role="main">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbsContext.Provider>
  )
}
