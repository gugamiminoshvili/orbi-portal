import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import styles from './CopyButton.module.css'

const OK_DURATION_MS = 1500

// Copies `value` to the clipboard and shows a transient "ok" state.
// Ported from reference/orbi-portal-redesign.html copyText() + .copy-btn (lines 322-326).
export default function CopyButton({ value, ariaLabel, className, ...rest }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  async function handleClick() {
    try {
      await navigator.clipboard?.writeText?.(value)
    } catch {
      // clipboard API unavailable (e.g. insecure context) — still show feedback
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), OK_DURATION_MS)
  }

  const classes = [styles['copy-btn'], copied ? styles.ok : null, className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} aria-label={ariaLabel} title={ariaLabel} onClick={handleClick} {...rest}>
      <Icon name={copied ? 'check' : 'copy'} size={14} />
    </button>
  )
}
