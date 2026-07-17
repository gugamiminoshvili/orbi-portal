import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { USE_MOCK } from '../../api/client'
import { getTicket, sendMessage, uploadTicketFile } from '../../api/endpoints/support'
import { TSTATUS, topicById } from '../../api/mock/tickets'
import { APTS } from '../../api/mock/apartments'
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
  const apt = ticket.apt ? APTS.find((a) => a.id === ticket.apt) : null

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

  // Mock mode keeps the existing toast-only stub (no real upload endpoint to
  // exercise). Real mode opens a hidden file input and, once a file is
  // picked, uploads it via POST /mobileApi/tickets/file/ (uploadTicketFile).
  function handleAttach() {
    if (USE_MOCK) {
      toast(t('support:attachToast'))
      return
    }
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file) return
    try {
      await uploadTicketFile(ticket.id, file)
      toast(t('support:attachSuccessToast'))
    } catch {
      toast(t('support:attachErrorToast'))
    }
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
            {apt ? (
              <span className={styles['si-apt']}>
                <Icon name="pin" />
                {apt.code}
              </span>
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
          {!USE_MOCK && (
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileChange}
            />
          )}
          <button
            type="button"
            className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}
            onClick={handleAttach}
            aria-label={t('support:attach')}
            title={t('support:attach')}
          >
            <Icon name="clip" />
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
