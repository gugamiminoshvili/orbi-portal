import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import styles from './Header.module.css'

// items: [{ label, to? }] — last item renders bold (current page), earlier
// items render as links when `to` is given. Ported from the crumbs() renderer
// at reference/orbi-portal-redesign.html lines 1024-1030.
export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={item.to || item.label || i}>
            {i > 0 && <span className={styles.sep}>›</span>}
            {last || !item.to ? <b>{item.label}</b> : <Link to={item.to}>{item.label}</Link>}
          </Fragment>
        )
      })}
    </nav>
  )
}
