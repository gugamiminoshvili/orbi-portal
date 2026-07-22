import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { listNews } from '../../api/endpoints/news'
import { USE_MOCK } from '../../api/client'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { SearchField } from '../../components/ui/Field'
import NewsCard from './NewsCard'
import NewsFilters from './NewsFilters'
import { NewsGridSkeleton } from './NewsSkeletons'
import { useNewsList, useNewsQueryState } from './useNewsList'
import styles from './News.module.css'

// GET /mobileApi/news/'s DRF pagination (docs/api-reference.md) is a fixed
// page size of 10 — distinct from the mock's client-side PER_PAGE (9).
const SERVER_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 300

export default function NewsListPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home'), to: '/' }, { label: t('common:news') }])

  // USE_MOCK is a build-time constant (never flips during a session), so
  // choosing between these two branches never violates rules-of-hooks —
  // each subcomponent below has its own fixed, unconditional hook sequence.
  return (
    <div>
      <div className={styles['page-head']}>
        <div>
          <h1>{t('news:title')}</h1>
        </div>
      </div>
      {USE_MOCK ? <MockNewsList /> : <RealNewsList />}
    </div>
  )
}

// Unchanged v1 behavior: load the full mock article list once and filter/
// sort/paginate entirely client-side via useNewsList (byte-identical to
// pre-I6 NewsListPage).
function MockNewsList() {
  const { data: items, loading } = useAsync(listNews, [])
  const { cat, q, sort, page, pageItems, pages, setCat, setQ, setSort, setPage } = useNewsList(items)

  return (
    <>
      <NewsFilters cat={cat} q={q} sort={sort} onCatChange={setCat} onQChange={setQ} onSortChange={setSort} />
      <NewsResults loading={loading} pageItems={pageItems} page={page} pages={pages} setPage={setPage} />
    </>
  )
}

// Real mode: the server owns paging and search (GET /mobileApi/news/?page=&
// search=); category filtering and client-side sort have no server
// equivalent yet (pending backend answer — see integration spec §5.4), so
// the category Seg and sort <select> are hidden entirely rather than shown
// non-functional.
function RealNewsList() {
  const { t } = useTranslation()
  const { q, page, setQ, setPage } = useNewsQueryState()

  // Debounced search: the input updates local state on every keystroke, but
  // the URL query param (and therefore the GET /mobileApi/news/?search=
  // request) only updates SEARCH_DEBOUNCE_MS after the user stops typing —
  // one server call per pause instead of one per keypress.
  const [draft, setDraft] = useState(q)
  useEffect(() => {
    if (draft === q) return undefined
    const timer = setTimeout(() => setQ(draft), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const { data, loading } = useAsync(() => listNews({ page, search: q }), [page, q])
  const pageItems = data?.items || []
  const pages = data ? Math.max(1, Math.ceil(data.count / SERVER_PER_PAGE)) : 1

  return (
    <>
      <div className={styles['news-toolbar']}>
        <SearchField
          className={styles['search-box']}
          placeholder={t('news:searchPlaceholder')}
          aria-label={t('news:searchPlaceholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <NewsResults loading={loading} pageItems={pageItems} page={page} pages={pages} setPage={setPage} />
    </>
  )
}

function NewsResults({ loading, pageItems, page, pages, setPage }) {
  const { t } = useTranslation()
  if (loading) return <NewsGridSkeleton />
  if (pageItems.length === 0) {
    return (
      <Card>
        <EmptyState title={t('news:empty')}>
          <p>{t('news:emptyHint')}</p>
        </EmptyState>
      </Card>
    )
  }
  return (
    <>
      <div className={styles['news-grid']}>
        {pageItems.map((n) => (
          <NewsCard key={n.id} item={n} />
        ))}
      </div>
      {pages > 1 && <Pager page={page} pages={pages} onChange={setPage} />}
    </>
  )
}

// Pager window logic mirrors pagerHtml() at reference lines 1129-1142.
function Pager({ page, pages, onChange }) {
  const { t } = useTranslation()

  const win = new Set([1, pages])
  for (let p = page - 1; p <= page + 1; p++) {
    if (p > 1 && p < pages) win.add(p)
  }
  const uniq = [...win].sort((a, b) => a - b)

  const entries = []
  let prev = 0
  for (const p of uniq) {
    if (p - prev > 1) entries.push({ dots: true, key: `dots-${p}` })
    entries.push({ page: p, key: p })
    prev = p
  }

  return (
    <nav className={styles.pager} aria-label={t('news:paginationAria')}>
      <button disabled={page === 1} aria-label={t('news:prevPageAria')} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {entries.map((e) =>
        e.dots ? (
          <span key={e.key} className={styles.dots}>
            …
          </span>
        ) : (
          <button
            key={e.key}
            className={e.page === page ? styles.on : undefined}
            aria-current={e.page === page ? 'page' : undefined}
            aria-label={t('news:pageAria', { n: e.page })}
            onClick={() => onChange(e.page)}
          >
            {e.page}
          </button>
        )
      )}
      <button disabled={page === pages} aria-label={t('news:nextPageAria')} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  )
}
