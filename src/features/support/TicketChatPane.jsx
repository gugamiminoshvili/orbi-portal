import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { getTicket, sendMessage, uploadTicketFile } from '../../api/endpoints/support'
import { TSTATUS, topicById } from '../../api/mock/tickets'
import { ATTACHMENT_ACCEPT, partitionFiles } from '../../utils/attachments'
import { AttachmentList } from './Attachments'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import fieldStyles from '../../components/ui/Field.module.css'
import EmptyPane from './EmptyPane'
import styles from './Support.module.css'

// Chat detail pane for /support/t/:tid. Mirrors supChatHtml() / sendMsg() at
// reference lines 2009-2048.
export default function TicketChatPane() {
  const { tid } = useParams()
  const ticketId = Number(tid)
  const { t } = useTranslation()
  const toast = useToast()
  const { bumpTicketsRefresh } = useOutletContext()
  const { data: ticket, loading, setData } = useAsync(() => getTicket(ticketId), [ticketId])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bodyRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [ticket])

  if (loading) return <ChatSkeleton />

  // Unknown ticket id: reference falls back to the list-mode empty pane
  // instead of leaving a permanent skeleton up.
  if (!ticket) {
    return <EmptyPane title={t('support:notFoundTitle')} message={t('support:notFoundMessage')} />
  }

  const tp = topicById(ticket.topic)
  const st = TSTATUS[ticket.status]
  const ticketApts = ticket.apts || []

  async function handleSend() {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const updated = await sendMessage(ticket.id, value)
      setText('')
      setData(updated)
      bumpTicketsRefresh()
    } catch {
      toast(t('common:requestFailed'))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleAttach() {
    fileInputRef.current?.click()
  }

  // Uploads via POST /mobileApi/tickets/file/, then re-reads the ticket so the
  // file appears in the thread. The endpoint returns only a stored path, and
  // takes no message id, so where the file lands is the server's call — the
  // re-fetch is what makes the result visible instead of a bare toast.
  async function handleFileChange(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = '' // allow re-selecting the same file next time
    const { accepted, errors } = partitionFiles(picked, t)
    if (errors.length) toast(errors[0])
    if (accepted.length === 0) return

    setUploading(true)
    let failed = 0
    for (const file of accepted) {
      try {
        await uploadTicketFile(ticket.id, file)
      } catch {
        failed += 1
      }
    }
    try {
      setData(await getTicket(ticket.id))
    } catch {
      // The upload itself already succeeded; a failed refresh only means the
      // thread is stale until the next visit, so don't report it as a failure.
    }
    setUploading(false)
    bumpTicketsRefresh()
    toast(failed > 0 ? t('support:attachSomeFailed', { count: failed }) : t('support:attachSuccessToast'))
  }

  let lastDate = null

  return (
    <>
      <div className={styles['sup-dhead']}>
        <Link to="/support" className={styles['sup-back']} aria-label={t('common:back')}>
          <Icon name="back" />
        </Link>
        <div className={styles['si-ic']} style={{ background: tp.tintBg, color: tp.tintCol }}>
          <Icon name={tp.icon} />
        </div>
        <div className={styles['dh-main']}>
          <h3>
            {t(`support:topics.${tp.id}.label`)} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>#{ticket.id}</span>
          </h3>
          <div className={styles['dh-sub']}>
            {/* Real tickets show the backend's own localized status text +
                closed_at-derived tone (adaptTicket, Task L1); mock falls
                back to the static TSTATUS/filter labels. */}
            <Badge tone={ticket.statusLabel ? ticket.statusTone : st.cls} dot>
              {ticket.statusLabel || t(`support:filters.${ticket.status}`)}
            </Badge>
            {ticketApts.length > 0 ? (
              ticketApts.map((a) => (
                <span key={a.id ?? a.code} className={styles['si-apt']}>
                  <Icon name="pin" />
                  {a.code}
                </span>
              ))
            ) : (
              <span>{t('support:general')}</span>
            )}
            <span>{ticket.created}</span>
          </div>
        </div>
      </div>
      <div className={styles['sup-dbody']} ref={bodyRef}>
        {ticket.msgs.map((m, i) => {
          const showDay = m.date !== lastDate
          lastDate = m.date
          return (
            <div key={i}>
              {showDay && (
                <div className={styles['chat-day']}>
                  <span>{m.date}</span>
                </div>
              )}
              <div className={`${styles.msg} ${m.me ? styles.me : styles.them}`}>
                <div className={styles.bubble}>
                  {!m.me && <div className={styles.who}>{m.who || t('support:orbiSupport')}</div>}
                  {m.text}
                  <AttachmentList files={m.files} />
                  <div className={styles.time}>{m.time}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {ticket.status !== 'active' ? (
        <div className={styles['chat-closed']}>{t(`support:closedNotice.${ticket.status}`)}</div>
      ) : (
        <div className={styles['chat-composer']}>
          <textarea
            className={fieldStyles.input}
            rows={1}
            placeholder={t('support:chatPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}
            onClick={handleAttach}
            disabled={uploading}
            aria-label={t('support:attach')}
            title={t('support:attach')}
          >
            {uploading ? <span className={styles.spin} /> : <Icon name="clip" />}
          </button>
          <Button onClick={handleSend} disabled={sending} aria-label={t('support:send')}>
            <Icon name="send" />
          </Button>
        </div>
      )}
    </>
  )
}

// Mirrors skChatBody() at reference lines 1869-1873.
function ChatSkeleton() {
  const bubbles = [
    ['them', '58%', 52],
    ['me', '44%', 36],
    ['them', '66%', 60],
    ['me', '38%', 36],
  ]
  return (
    <div className={styles['sup-dbody']}>
      <div className={styles['chat-day']}>
        <Skeleton w={74} h={18} r={999} />
      </div>
      {bubbles.map(([side, w, h], i) => (
        <div key={i} className={`${styles.msg} ${side === 'me' ? styles.me : styles.them}`}>
          <Skeleton w={w} h={h} r={15} />
        </div>
      ))}
    </div>
  )
}
