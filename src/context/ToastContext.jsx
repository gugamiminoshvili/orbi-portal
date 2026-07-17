import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import styles from './Toast.module.css'

const ToastContext = createContext(null)

const AUTO_HIDE_MS = 2400

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  const timerRef = useRef(null)

  const toast = useCallback((msg) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    timerRef.current = setTimeout(() => {
      setMessage(null)
      timerRef.current = null
    }, AUTO_HIDE_MS)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`${styles.toast} ${message ? styles.show : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export { ToastContext }
