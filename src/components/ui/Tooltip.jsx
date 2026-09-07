import { useEffect, useId, useRef, useState } from 'react'
import styles from './Tooltip.module.css'

// A short explanatory bubble. Hover and keyboard focus open it on a pointer
// device; a tap opens it on a touch screen, where there is no hover at all
// (owner call 2026-09-04). Both are wired unconditionally rather than behind
// a media query, because a laptop with a touch screen is both.
//
// `interactive: false` renders the trigger as a plain span instead of a
// button. That is for the one place the trigger is already inside a button —
// the header pill — where nesting a second one would be invalid HTML. It
// costs the keyboard and tap routes there, which is why the same text is
// also reachable from the account menu and the profile page.
export default function Tooltip({
  text,
  align = 'center',
  interactive = true,
  className,
  children,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const id = useId()

  // A tap opens it; the next tap anywhere else closes it. Without this the
  // bubble would stay on screen on touch, since nothing there ever fires a
  // mouseleave.
  useEffect(() => {
    if (!open) return
    function onDocPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!text) return children

  const triggerProps = {
    className: styles.trigger,
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    'aria-describedby': open ? id : undefined,
  }

  return (
    <span ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {interactive ? (
        <button
          type="button"
          {...triggerProps}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={(e) => {
            // The trigger often sits inside a row or a card that has a click
            // of its own; asking "why?" must not also navigate.
            e.preventDefault()
            e.stopPropagation()
            setOpen((o) => !o)
          }}
        >
          {children}
        </button>
      ) : (
        <span {...triggerProps}>{children}</span>
      )}
      {open && (
        <span role="tooltip" id={id} className={`${styles.bubble} ${styles[align]}`}>
          {text}
        </span>
      )}
    </span>
  )
}
