import styles from './DonutChart.module.css'

// Pure SVG donut, same stroke-dasharray technique as ProgressRing (no chart
// lib — see the design doc's "Donut" decision). Unlike ProgressRing's single
// progress arc, this stacks N segments around the ring: each is drawn as its
// own full-circle <circle> whose dasharray reserves only its own slice length
// and whose dashoffset skips past every segment already drawn, so the ring
// is built up in single-color arcs rather than one circle rotated per slice.
// `segments`: [{ key, value, color }] — negative values are clamped to 0
// (the multi-pay/debt figures this renders should never be negative, but a
// stray one shouldn't invert a slice).
export default function DonutChart({ segments = [], size = 120, strokeWidth = 16, ariaLabel, center }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0)

  let drawn = 0
  const arcs = segments.map((seg) => {
    const value = Math.max(seg.value, 0)
    const pct = total > 0 ? value / total : 0
    const dash = c * pct
    const offset = c * (1 - drawn)
    drawn += pct
    return { ...seg, dash, offset }
  })

  return (
    <div className={styles.donut} role="img" aria-label={ariaLabel} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={strokeWidth} />
        {arcs.map((arc) =>
          arc.dash > 0 ? (
            <circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arc.dash.toFixed(1)} ${(c - arc.dash).toFixed(1)}`}
              strokeDashoffset={arc.offset.toFixed(1)}
            />
          ) : null
        )}
      </svg>
      {center != null && <div className={styles.center}>{center}</div>}
    </div>
  )
}
