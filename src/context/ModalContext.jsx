import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

const ModalContext = createContext(null)

const SIZE_CLASS = {
  '': null,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]),input,select,[tabindex="0"],a[href]'

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null) // { node, size }
  const overlayRef = useRef(null)
  const boxRef = useRef(null)
  const lastFocusedRef = useRef(null)
  // Mirrors `modalLocked` at reference/orbi-portal-redesign.html line 353 — while
  // locked, neither ESC nor overlay mousedown nor an explicit closeModal() call
  // can dismiss the modal (used by ElectricityReportModal's "generating" step).
  const lockedRef = useRef(false)

  const closeModal = useCallback(() => {
    if (lockedRef.current) return
    setModal(null)
    const toFocus = lastFocusedRef.current
    if (toFocus && typeof toFocus.focus === 'function') toFocus.focus()
    lastFocusedRef.current = null
  }, [])

  const openModal = useCallback((node, { size = '' } = {}) => {
    lockedRef.current = false
    lastFocusedRef.current = document.activeElement
    setModal({ node, size })
  }, [])

  const setModalLocked = useCallback((value) => {
    lockedRef.current = value
  }, [])

  // Body scroll lock while a modal is open.
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [modal])

  // ESC closes.
  useEffect(() => {
    if (!modal) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modal, closeModal])

  // Focus trap: focus the first focusable element shortly after open, cycle Tab/Shift+Tab within the box.
  useEffect(() => {
    if (!modal) return undefined
    const box = boxRef.current
    if (!box) return undefined

    const timer = setTimeout(() => {
      const focusable = box.querySelectorAll(FOCUSABLE_SELECTOR)
      focusable[0]?.focus?.()
    }, 30)

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const focusable = box.querySelectorAll(FOCUSABLE_SELECTOR)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [modal])

  const handleOverlayMouseDown = useCallback((e) => {
    if (e.target === overlayRef.current) closeModal()
  }, [closeModal])

  return (
    <ModalContext.Provider value={{ openModal, closeModal, setModalLocked }}>
      {children}
      {modal && createPortal(
        <div
          ref={overlayRef}
          data-testid="modal-overlay"
          role="dialog"
          aria-modal="true"
          className={`${styles['modal-overlay']} ${styles.open}`}
          onMouseDown={handleOverlayMouseDown}
        >
          <div
            ref={boxRef}
            data-testid="modal-box"
            className={[styles.modal, SIZE_CLASS[modal.size]].filter(Boolean).join(' ')}
          >
            {modal.node}
          </div>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within a ModalProvider')
  return ctx
}
