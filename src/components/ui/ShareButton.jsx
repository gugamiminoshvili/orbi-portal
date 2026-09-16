import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import Button from './Button'
import Icon from './Icon'

// Share a public link: the phone's own share sheet where there is one, the
// clipboard everywhere else.
//
// The two paths are deliberately one button. A "Copy link" that opens a
// share sheet on a phone and copies on a desktop is the same intention
// either way, and splitting it would leave desktop users hunting for a
// sheet that does not exist there.
export default function ShareButton({ url, title, label, variant = 'ghost', size = 'sm', className, ...rest }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (busy) return
    setBusy(true)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, url })
          return
        } catch (e) {
          // Cancelling the sheet is not a failure and must not be reported
          // as one; anything else falls through to the clipboard.
          if (e?.name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard?.writeText?.(url)
        toast(t('common:linkCopied'))
      } catch {
        // No clipboard (an insecure context, or a browser that refuses):
        // show the link itself rather than claiming a copy that never
        // happened.
        toast(url)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      aria-label={t('common:shareAria')}
      data-share={url}
      {...rest}
    >
      <Icon name="share" /> {label || t('common:share')}
    </Button>
  )
}
