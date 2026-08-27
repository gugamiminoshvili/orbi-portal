import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { useModal } from './ModalContext'
import { accountStatus } from '../utils/accountStatus'
import { reasonKey } from '../features/verification/reasons'
import VerificationModal from '../features/verification/VerificationModal'

const VerificationContext = createContext({
  blocked: false,
  reason: 'generic',
  showBlockedModal: () => {},
  guard: (fn) => fn,
})

// An account the back office marked Invalid keeps its read-only view of the
// portal but cannot act. Rather than disabling controls one by one — which
// leaves the owner guessing why — the action runs into a dialog that names
// the reason and offers the one way out that fits it.
//
// FLAG: this can only fire once /mobileApi/user/ starts sending the status
// (README §19) and, for the right wording, the reason. Until then
// accountStatus() returns null, `blocked` is false, and nothing here is
// reachable — by design, since inventing a block would be worse.
export function VerificationProvider({ children }) {
  const { user, status: authStatus } = useAuth()
  const { openModal } = useModal()
  const { i18n } = useTranslation()
  const location = useLocation()

  const blocked = accountStatus(user) === 'invalid'
  const reason = useMemo(
    () => reasonKey(user?.verification_reason ?? user?.verificationReason ?? user?.invalid_reason),
    [user]
  )

  const showBlockedModal = useCallback(() => {
    openModal(<VerificationModal reason={reason} />, { size: '' })
  }, [openModal, reason])

  // Wraps an action: blocked accounts get the dialog instead of the action.
  const guard = useCallback(
    (fn) => (...args) => {
      if (blocked) {
        showBlockedModal()
        return undefined
      }
      return fn(...args)
    },
    [blocked, showBlockedModal]
  )

  // On sign-in / app open. Keyed on the transition into 'authed' rather than
  // on every render, so navigating around does not re-open it.
  const announced = useRef(false)
  useEffect(() => {
    if (authStatus !== 'authed') {
      announced.current = false
      return
    }
    if (blocked && !announced.current) {
      announced.current = true
      showBlockedModal()
    }
  }, [authStatus, blocked, showBlockedModal])

  // On a language change — the owner asked for it, and it is defensible: the
  // dialog is the one thing they most need to have understood, so it is
  // worth restating in the language they just picked.
  const firstLang = useRef(true)
  useEffect(() => {
    if (firstLang.current) {
      firstLang.current = false
      return
    }
    if (blocked) showBlockedModal()
  }, [i18n.language, blocked, showBlockedModal])

  // On entering Support. The page itself stays reachable — the owner can
  // read what is already there — but arriving states why nothing can be sent.
  const lastSupport = useRef(false)
  useEffect(() => {
    const onSupport = location.pathname.startsWith('/support')
    if (onSupport && !lastSupport.current && blocked) showBlockedModal()
    lastSupport.current = onSupport
  }, [location.pathname, blocked, showBlockedModal])

  const value = useMemo(
    () => ({ blocked, reason, showBlockedModal, guard }),
    [blocked, reason, showBlockedModal, guard]
  )
  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>
}

export function useVerification() {
  return useContext(VerificationContext)
}
