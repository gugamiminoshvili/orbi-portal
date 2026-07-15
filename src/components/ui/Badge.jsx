import styles from './Badge.module.css'

const TONE_CLASS = {
  pos: styles.pos,
  warn: styles.warn,
  neg: styles.neg,
  info: styles.info,
  muted: styles.muted,
}

export function Badge({ tone = 'muted', dot = false, className, children, ...rest }) {
  const classes = [styles.badge, TONE_CLASS[tone] || TONE_CLASS.muted, className].filter(Boolean).join(' ')
  return (
    <span className={classes} {...rest}>
      {dot && <span className={styles['b-dot']} />}
      {children}
    </span>
  )
}

export function Chip({ className, children, ...rest }) {
  const classes = [styles.chip, className].filter(Boolean).join(' ')
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}

export function Seg({ options = [], value, onChange, className, ...rest }) {
  const classes = [styles.seg, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {options.map((opt) => {
        const optValue = opt.value ?? opt
        const optLabel = opt.label ?? opt
        const on = optValue === value
        return (
          <button
            key={optValue}
            type="button"
            className={on ? styles.on : undefined}
            onClick={() => onChange?.(optValue)}
          >
            {optLabel}
          </button>
        )
      })}
    </div>
  )
}

export default Badge
