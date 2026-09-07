import { useTranslation } from 'react-i18next'
import { useVerification } from '../../context/VerificationContext'
import styles from './Verification.module.css'

// The hover/tap explanation on the account status. It is not its own copy:
// it is the heading and body of the dialog that status opens, for the
// operator's actual reason (owner call 2026-09-04). Writing a second,
// vaguer sentence beside the dialog's own was how the tooltip ended up
// contradicting it — the Pending one claimed actions were unavailable while
// the dialog said nothing further was needed.
export function useStatusHint(status) {
  const { t } = useTranslation()
  const { reason } = useVerification()

  // Verified explains itself; anything unknown has nothing to explain.
  if (status !== 'invalid' && status !== 'pending') return null

  const key = status === 'pending' ? 'pending' : reason
  return (
    <>
      <b className={styles['tip-t']}>{t(`verification:reasons.${key}.title`)}</b>
      {t(`verification:reasons.${key}.desc`)}
    </>
  )
}
