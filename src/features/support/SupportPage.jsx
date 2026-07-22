import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import TicketList from './TicketList'
import cardStyles from '../../components/ui/Card.module.css'
import styles from './Support.module.css'

// Two-pane Support shell, mirroring the `support` route at reference lines
// 1810-1841: a persistent ticket list on the left plus a detail pane on the
// right that swaps between empty / chat / create depending on the child
// route. The child route (Outlet) decides what shows on the right; this
// component only owns the list-pane state (search/filter/refresh) since it
// stays mounted across /support, /support/new and /support/t/:tid.
export default function SupportPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home'), to: '/' }, { label: t('support:title') }])

  const location = useLocation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshToken, setRefreshToken] = useState(0)

  // Bumped after createTicket/sendMessage so the list re-fetches and picks up
  // the new/updated ticket without the list pane owning that logic itself.
  const bumpTicketsRefresh = useCallback(() => setRefreshToken((x) => x + 1), [])

  const mode = useMemo(() => {
    if (location.pathname.startsWith('/support/new')) return 'create'
    if (location.pathname.startsWith('/support/t/')) return 'chat'
    return 'list'
  }, [location.pathname])

  const activeId = mode === 'chat' ? Number(location.pathname.split('/support/t/')[1]) : null

  return (
    <div>
      <div className={styles['page-head']}>
        <div>
          <h1>{t('support:title')}</h1>
        </div>
      </div>
      <div className={styles['sup-wrap']} data-mode={mode}>
        <aside className={`${cardStyles.card} ${styles['sup-list']}`}>
          <TicketList
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            activeId={activeId}
            refreshToken={refreshToken}
          />
        </aside>
        <section className={`${cardStyles.card} ${styles['sup-detail']}`}>
          <Outlet context={{ bumpTicketsRefresh }} />
        </section>
      </div>
    </div>
  )
}
