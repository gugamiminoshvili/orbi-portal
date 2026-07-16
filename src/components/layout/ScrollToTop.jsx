import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

// Scrolls the window to the top on route change. Also reacts to the news
// list's `page` search param so paginating (which stays on the same
// pathname) still resets scroll — mirrors the prototype's scroll-on-page-
// change behavior without firing on every other search-param change (e.g.
// news filters/search-as-you-type).
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const page = searchParams.get('page')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, page])

  return null
}
