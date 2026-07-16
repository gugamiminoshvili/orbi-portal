import styles from './ProgressRing.module.css'

// Ported from reference/orbi-portal-redesign.html progressRing() at lines 1388-1394.
// `label` is the small caption under the number (e.g. "days left") and
// `ariaLabel` is the full accessible description — both are supplied by the
// caller so this component stays translation-agnostic.
export default function ProgressRing({ left, total, label, ariaLabel }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, total > 0 ? left / total : 0))
  const off = c * (1 - pct)

  return (
    <div className={styles.ring} role="img" aria-label={ariaLabel}>
      <svg width="74" height="74" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r={r} fill="none" stroke="var(--line-2)" strokeWidth="6" />
        <circle
          cx="37"
          cy="37"
          r={r}
          fill="none"
          stroke="var(--teal)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
        />
      </svg>
      <div className={styles.rt}>
        <b>{left}</b>
        <small>{label}</small>
      </div>
    </div>
  )
}
