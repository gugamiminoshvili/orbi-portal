import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { listNews } from '../../api/endpoints/news'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import NewsCard from './NewsCard'
import NewsFilters from './NewsFilters'
import { NewsGridSkeleton } from './NewsSkeletons'
import { useNewsList } from './useNewsList'
import styles from './News.module.css'

export default function NewsListPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home'), to: '/' }, { label: t('common:news') }])

  const { data: items, loading } = useAsync(listNews, [])
  const { cat, q, sort, page, pageItems, pages, setCat, setQ, setSort, setPage } = useNewsList(items)

  return (
    <div>
      <div className={styles['page-head']}>
        <div>
          <h1>{t('news:title')}</h1>
          <p>{t('news:subtitle')}</p>
        </div>
      </div>

      <NewsFilters
        cat={cat}
        q={q}
        sort={sort}
        onCatChange={setCat}
        onQChange={setQ}
        onSortChange={setSort}
      />

      {loading ? (
        <NewsGridSkeleton />
      ) : pageItems.length === 0 ? (
        <Card>
          <EmptyState title={t('news:empty')}>
            <p>{t('news:emptyHint')}</p>
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className={styles['news-grid']}>
            {pageItems.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
          {pages > 1 && <Pager page={page} pages={pages} onChange={setPage} />}
        </>
      )}
    </div>
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
