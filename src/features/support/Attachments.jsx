import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { downloadTicketFile } from '../../api/endpoints/support'
import { formatBytes } from '../../utils/attachments'
import Icon from '../../components/ui/Icon'
import styles from './Support.module.css'

// The messages payload gives `{id, size, type, url}` and no filename, so the
// chip falls back through what it does have. `size` arrives pre-formatted
// from the API ("1 Mb"); a locally picked File has a numeric one instead.
function fileLabel(file, t) {
  return file.name || file.type || t('support:fileGeneric')
}

function fileMeta(file) {
  if (typeof file.size === 'number') return formatBytes(file.size)
  return file.size || ''
}

// Files already stored on a ticket message, rendered inside the chat bubble.
// Each one downloads through the API rather than linking straight at the URL:
// GET /mobileApi/ticket_file/{id}/ needs the Bearer header, which an <a href>
// can't send.
export function AttachmentList({ files }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)

  if (!files || files.length === 0) return null

  async function handleDownload(file) {
    if (busyId != null) return
    setBusyId(file.id)
    try {
      const blob = await downloadTicketFile(file.id)
      if (!blob) {
        // Mock mode: the file exists in the demo's state but has no bytes.
        toast(t('support:downloadUnavailable'))
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name || `ticket-file-${file.id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast(t('support:downloadError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ul className={styles['msg-files']}>
      {files.map((file) => (
        <li key={file.id}>
          <button
            type="button"
            className={styles['file-chip']}
            disabled={busyId === file.id}
            onClick={() => handleDownload(file)}
          >
            <Icon name="clip" />
            <span className={styles['fc-name']}>{fileLabel(file, t)}</span>
            {fileMeta(file) && <span className={styles['fc-size']}>{fileMeta(file)}</span>}
            <span className="sr-only">{t('support:downloadFile')}</span>
            <Icon name="dl" />
          </button>
        </li>
      ))}
    </ul>
  )
}

// Files picked on the new-ticket form but not uploaded yet — there is no
// ticket to attach them to until it has been created, so they are held here
// and sent right after createTicket() returns an id.
export function PendingAttachments({ files, onRemove }) {
  const { t } = useTranslation()
  if (files.length === 0) return null
  return (
    <ul className={styles['pending-files']}>
      {files.map((file, i) => (
        <li key={`${file.name}-${i}`} className={styles['file-chip']}>
          <Icon name="clip" />
          <span className={styles['fc-name']}>{file.name}</span>
          <span className={styles['fc-size']}>{formatBytes(file.size)}</span>
          <button
            type="button"
            className={styles['fc-x']}
            aria-label={t('support:removeFile', { name: file.name })}
            onClick={() => onRemove(i)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
