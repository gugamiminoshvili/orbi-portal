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
// Live since the backend started sending `is_passport_valid` (3 = invalid)
// and `passport_invalidity_reason` alongside it. When the payload says
// nothing, accountStatus() returns null, `blocked` is false, and nothing
// here is reachable — inventing a block would be worse.
export function VerificationProvider({ children }) {
  const { user, status: authStatus } = useAuth()
  const { openModal } = useModal()
  const { i18n } = useTranslation()
  const location = useLocation()

  const status = accountStatus(user)
  // Invalid is the only status that RESTRICTS anything — that was the spec.
  // Pending restricts nothing: its dialog says "nothing further is needed
  // from you", so guarding an action with it would contradict the words on
  // the screen.
  const blocked = status === 'invalid'
  // ...but both are ANNOUNCED. A review in progress is news the owner has
  // not necessarily seen yet.
  const announceable = status === 'invalid' || status === 'pending'
  // `passport_invalidity_reason` is the live field name (owner 2026-09-04);
  // the others are earlier guesses, kept so a rename cannot silently blank
  // the dialog. Read ONLY when the status is 3 — the backend leaves stale or
  // meaningless content there for every other status, so trusting it would
  // put a rejection reason on an account that has none.
  const reason = useMemo(() => {
    if (status !== 'invalid') return 'generic'
    return reasonKey(
      user?.passport_invalidity_reason ??
        user?.passportInvalidityReason ??
        user?.verification_reason ??
        user?.verificationReason ??
        user?.invalid_reason
    )
  }, [status, user])

  // The dialog's face: the operator's reason when the account was rejected,
  // and the pending state's own copy while it is still under review.
  const face = status === 'pending' ? 'pending' : reason
  const showBlockedModal = useCallback(() => {
    openModal(<VerificationModal reason={face} />, { size: '' })
  }, [openModal, face])

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
    if (announceable && !announced.current) {
      announced.current = true
      showBlockedModal()
    }
  }, [authStatus, announceable, showBlockedModal])

  // On a language change — the owner asked for it, and it is defensible: the
  // dialog is the one thing they most need to have understood, so it is
  // worth restating in the language they just picked.
  const firstLang = useRef(true)
  useEffect(() => {
    if (firstLang.current) {
      firstLang.current = false
      return
    }
    if (announceable) showBlockedModal()
  }, [i18n.language, announceable, showBlockedModal])

  // On entering Support. The page itself stays reachable — the owner can
  // read what is already there — but arriving states why nothing can be sent.
  const lastSupport = useRef(false)
  useEffect(() => {
    const onSupport = location.pathname.startsWith('/support')
    if (onSupport && !lastSupport.current && announceable) showBlockedModal()
    lastSupport.current = onSupport
  }, [location.pathname, announceable, showBlockedModal])

  const value = useMemo(
    () => ({ blocked, reason, showBlockedModal, guard }),
    [blocked, reason, showBlockedModal, guard]
  )
  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>
}

export function useVerification() {
  return useContext(VerificationContext)
}
