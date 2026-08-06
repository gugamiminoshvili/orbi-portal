import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { getTicket, sendMessage, uploadTicketFile } from '../../api/endpoints/support'
import { TSTATUS, topicById } from '../../api/mock/tickets'
import { ATTACHMENT_ACCEPT, partitionFiles } from '../../utils/attachments'
import { AttachmentList, PendingAttachments } from './Attachments'
import Icon from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
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
  // Picked but not sent yet: an attachment goes up with the message,
  // not the moment it is chosen (owner call 2026-08-06), so the user can
  // see what they attached and drop it again first.
  const [pending, setPending] = useState([])
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

  // One send handles both halves: the message (if any) and the queued
  // attachments. Files go after the message so they land on the thread in the
  // order they were composed.
  async function handleSend() {
    const value = text.trim()
    if ((!value && pending.length === 0) || sending) return
    setSending(true)
    let failed = 0
    try {
      if (value) await sendMessage(ticket.id, value)
      for (const file of pending) {
        try {
          await uploadTicketFile(ticket.id, file)
        } catch {
          failed += 1
        }
      }
      setText('')
      setPending([])
      // Re-read rather than trusting sendMessage's return: it doesn't know
      // about the uploads, and the server decides where a file lands.
      setData(await getTicket(ticket.id))
      bumpTicketsRefresh()
      if (failed > 0) toast(t('support:attachSomeFailed', { count: failed }))
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

  // Queues the picked files; the upload itself happens in handleSend.
  function handleFileChange(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = '' // allow re-selecting the same file next time
    const { accepted, errors } = partitionFiles(picked, t)
    if (errors.length) toast(errors[0])
    if (accepted.length) setPending((prev) => [...prev, ...accepted])
  }

  function removePending(index) {
    setPending((prev) => prev.filter((_, i) => i !== index))
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
          // A run of messages from the same side on the same day reads as one
          // turn: only the last of the run gets the tail corner, and only the
          // first gets the avatar and the sender's name.
          const prev = ticket.msgs[i - 1]
          const next = ticket.msgs[i + 1]
          const runStart = showDay || !prev || prev.me !== m.me
          const runEnd = !next || next.me !== m.me || next.date !== m.date
          return (
            <div key={i}>
              {showDay && (
                <div className={styles['chat-day']}>
                  <span>{m.date}</span>
                </div>
              )}
              <div
                className={`${styles.msg} ${m.me ? styles.me : styles.them} ${runEnd ? '' : styles.cont}`}
              >
                {!m.me && (
                  <span className={styles['msg-avatar']} aria-hidden="true">
                    <Icon name="chat" />
                  </span>
                )}
                <div className={styles.bubble}>
                  {!m.me && runStart && (
                    <div className={styles.who}>{m.who || t('support:orbiSupport')}</div>
                  )}
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
          {/* Queued attachments sit above the field, so what is about to be
              sent is visible before Send is pressed. */}
          <PendingAttachments files={pending} onRemove={removePending} />
          {/* The border and focus ring live on this box, not on the textarea —
              so the field and its two buttons read as one control. */}
          <div className={styles['composer-box']}>
            {/* Auto-grow with no JS: the wrapper is a 1x1 grid holding both
                the textarea and an invisible ::after carrying the same text
                (data-value). The ::after sets the row height, the textarea
                stretches to it. Measuring scrollHeight instead was unreliable
                — the textarea is a flex item, and its reported content height
                lagged the value by a render. */}
            <div className={styles['ta-grow']} data-value={text}>
              <textarea
                rows={1}
                placeholder={t('support:chatPlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
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
              className={styles['composer-act']}
              onClick={handleAttach}
              disabled={sending}
              aria-label={t('support:attach')}
              title={t('support:attach')}
            >
              <Icon name="clip" />
            </button>
            <button
              type="button"
              className={`${styles['composer-act']} ${styles['composer-send']}`}
              onClick={handleSend}
              disabled={sending || (!text.trim() && pending.length === 0)}
              aria-label={t('support:send')}
              title={t('support:send')}
            >
              <Icon name="send" />
            </button>
          </div>
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
