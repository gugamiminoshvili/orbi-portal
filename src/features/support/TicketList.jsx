import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../hooks/useAsync'
import { listTickets } from '../../api/endpoints/support'
import { SUP_FILTERS, TSTATUS, topicById } from '../../api/mock/tickets'
import { APTS } from '../../api/mock/apartments'
import { SearchField } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Support.module.css'

// Left pane: search + status tabs + ticket rows. Mirrors supListHtml() /
// supItemsHtml() at reference lines 1843-1895.
export default function TicketList({ query, onQueryChange, filter, onFilterChange, activeId, refreshToken }) {
  const { t } = useTranslation()
  const { data: tickets, loading } = useAsync(listTickets, [refreshToken])

  const items = useMemo(() => {
    let list = tickets || []
    list = list.filter((ticket) => filter === 'all' || ticket.status === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((ticket) => {
        const tp = topicById(ticket.topic)
        const label = tp ? t(`support:topics.${tp.id}.label`).toLowerCase() : ''
        return label.includes(q) || ticket.preview.toLowerCase().includes(q) || String(ticket.id).includes(q)
      })
    }
    return list
  }, [tickets, filter, query, t])

  return (
    <>
      <div className={styles['sup-list-top']}>
        <div className={styles.row1}>
          <SearchField
            className={styles['search-wrap']}
            type="search"
            placeholder={t('support:searchPlaceholder')}
            aria-label={t('support:searchAria')}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <Link
            to="/support/new"
            className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}
            aria-label={t('support:newTicket')}
          >
            <Icon name="plus" /> {t('support:new')}
          </Link>
        </div>
        <div className={styles['sup-tabs']} role="tablist" aria-label={t('support:filterAria')}>
          {SUP_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={f === filter}
              className={f === filter ? styles.on : undefined}
              onClick={() => onFilterChange(f)}
            >
              {t(`support:filters.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles['sup-items']}>
        {loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <div className={styles['sup-empty']}>
            <div className={styles.ei}>
              <Icon name="chat" />
            </div>
            <h3>{t('support:empty')}</h3>
            <p>{t('support:emptyHint')}</p>
          </div>
        ) : (
          items.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} active={ticket.id === activeId} t={t} />)
        )}
      </div>
    </>
  )
}

function TicketRow({ ticket, active, t }) {
  const tp = topicById(ticket.topic)
  const st = TSTATUS[ticket.status]
  const apt = ticket.apt ? APTS.find((a) => a.id === ticket.apt) : null
  return (
    <Link
      to={`/support/t/${ticket.id}`}
      className={`${styles['sup-item']} ${active ? styles.on : ''}`}
      aria-label={t('support:ticketAria', { id: ticket.id })}
    >
      <div className={styles['si-ic']} style={{ background: tp.tintBg, color: tp.tintCol }}>
        <Icon name={tp.icon} />
      </div>
      <div className={styles['si-main']}>
        <div className={styles['si-top']}>
          <span className={styles['si-title']}>{t(`support:topics.${tp.id}.label`)}</span>
          <Badge tone={st.cls} dot>
            {t(`support:filters.${ticket.status}`)}
          </Badge>
        </div>
        <div className={styles['si-prev']}>{ticket.preview}</div>
        <div className={styles['si-meta']}>
          {apt && (
            <span className={styles['si-apt']}>
              <Icon name="pin" />
              {apt.code}
            </span>
          )}
          <span>#{ticket.id}</span>
          <span>·</span>
          <span>{ticket.created.split(' ')[0]}</span>
        </div>
      </div>
    </Link>
  )
}

// Mirrors skSupItems() at reference lines 1857-1868 — 6 placeholder rows.
function ListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div className={styles['sup-item']} key={i} style={{ pointerEvents: 'none' }}>
          <Skeleton w={40} h={40} r={11} style={{ flex: 'none' }} />
          <div className={styles['si-main']} style={{ flex: 1 }}>
            <Skeleton h={13} w="54%" style={{ margin: '2px 0 0' }} />
            <Skeleton h={12} w="86%" style={{ margin: '9px 0 0' }} />
            <Skeleton h={10} w="38%" style={{ margin: '9px 0 0' }} />
          </div>
        </div>
      ))}
    </>
  )
}
