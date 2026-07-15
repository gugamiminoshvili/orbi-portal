import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export const PER_PAGE = 9

// Pure filter/sort/paginate helper — mirrors reference/orbi-portal-redesign.html
// lines 1101-1105 (newsFiltered) and 1121-1124 (paintNews pagination slicing).
export function applyNewsQuery(items, { cat = 'All', q = '', sort = 'new', page = 1, perPage = PER_PAGE } = {}) {
  const needle = q.toLowerCase()
  const filtered = items
    .filter((n) => (cat === 'All' || n.cat === cat) && (n.title + n.excerpt).toLowerCase().includes(needle))
    .sort((a, b) => (sort === 'old' ? a.ts - b.ts : b.ts - a.ts))

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * perPage
  const pageItems = filtered.slice(start, start + perPage)

  return { pageItems, pages, total, page: safePage }
}

// URL-backed query state: ?cat=&q=&sort=&page= — changing cat/q/sort resets page to 1.
export function useNewsQueryState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cat = searchParams.get('cat') || 'All'
  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'new'
  const page = Number(searchParams.get('page')) || 1

  function update(patch, { resetPage = false } = {}) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === 'All' || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      if (resetPage) next.delete('page')
      return next
    })
  }

  return {
    cat,
    q,
    sort,
    page,
    setCat: (next) => update({ cat: next }, { resetPage: true }),
    setQ: (next) => update({ q: next }, { resetPage: true }),
    setSort: (next) => update({ sort: next }, { resetPage: true }),
    setPage: (next) => update({ page: next }),
  }
}

// Combines the URL-backed query state with a filtered/sorted/paginated view
// of the given news items (already loaded by the caller via useAsync).
export function useNewsList(items) {
  const query = useNewsQueryState()
  const result = useMemo(
    () => applyNewsQuery(items || [], query),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, query.cat, query.q, query.sort, query.page]
  )
  return { ...query, ...result }
}
