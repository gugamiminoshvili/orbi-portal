import styles from './Switch.module.css'

// On/off toggle. `role="switch"` on a <button> rather than a styled checkbox:
// it carries no form value, and screen readers announce it as "on"/"off"
// instead of "checked", which is what a setting like dark mode is.
//
// It has no visible label of its own — the caller supplies one, either by
// pointing `labelledBy` at the row's text or by passing `ariaLabel`.
export default function Switch({ checked, onChange, labelledBy, ariaLabel, disabled, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      disabled={disabled}
      className={`${styles.switch} ${className}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  )
}

// The same visual with no semantics, for when an ancestor already carries the
// state — e.g. a `role="menuitemcheckbox"` row whose whole width is the hit
// target. Nesting a real switch inside it would announce the state twice and
// put a button inside a button.
export function SwitchVisual({ checked, className = '' }) {
  return (
    <span aria-hidden="true" data-checked={checked} className={`${styles.switch} ${className}`}>
      <span className={styles.knob} />
    </span>
  )
}
