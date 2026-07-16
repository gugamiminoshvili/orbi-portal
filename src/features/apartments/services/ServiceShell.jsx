import { useId, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import styles from '../Detail.module.css'

// Accordion shell shared by the Maintenance / Water / Electricity / Internet
// service cards. Ported from svcShell() at reference/orbi-portal-redesign.html
// lines 1343-1352 — header button + aria-expanded + grid-template-rows
// 0fr -> 1fr animation defined in Detail.module.css (.svc-body / .svc.open).
export default function ServiceShell({ id, icon, iconBg, iconColor, name, sub, right, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <article id={id} className={`${styles.svc} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles['svc-head']}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={styles['svc-ic']} style={{ background: iconBg, color: iconColor }}>
          <Icon name={icon} />
        </div>
        <div className={styles['svc-tt']}>
          <div className={styles['svc-name']}>{name}</div>
          <div className={styles['svc-sub']}>{sub}</div>
        </div>
        {right}
        <span className={styles.chev} aria-hidden="true">
          <Icon name="chevron" />
        </span>
      </button>
      <div className={styles['svc-body']} id={bodyId}>
        <div className={styles.inner}>
          <div className={styles['svc-inner']}>{children}</div>
        </div>
      </div>
    </article>
  )
}

// Ported from metricHtml() at reference line 1342 — the right-aligned
// label/value pair shown in the collapsed header row.
export function Metric({ label, children }) {
  return (
    <div className={styles['svc-metric']}>
      <div className={styles['m-lab']}>{label}</div>
      <div className={styles['m-val']}>{children}</div>
    </div>
  )
}
