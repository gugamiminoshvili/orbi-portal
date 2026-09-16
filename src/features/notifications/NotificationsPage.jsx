import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useNotifications } from '../../context/NotificationsContext'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import NotificationRow from './NotificationRow'
import styles from './Notifications.module.css'

const DAY = 24 * 3600 * 1000

// Grouped by age rather than listed flat: "today" and "this week" are the
// only two distinctions an owner scanning the list actually makes.
function group(items) {
  const now = Date.now()
  const out = { today: [], week: [], older: [] }
  for (const n of items) {
    const age = now - (n.ts || 0)
    if (age < DAY) out.today.push(n)
    else if (age < 7 * DAY) out.week.push(n)
    else out.older.push(n)
  }
  return out
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('notifications:title') }])

  const { items, unread, loading, markAll } = useNotifications()
  // The page opens on everything; the filter is for the owner who came here
  // to work through what is new.
  const [onlyNew, setOnlyNew] = useState(false)

  const visible = useMemo(() => (onlyNew ? items.filter((n) => !n.seen) : items), [items, onlyNew])
  const groups = useMemo(() => group(visible), [visible])

  const head = (
    <div className={styles.head}>
      <div>
        <h1>{t('notifications:title')}</h1>
        <p>{t('notifications:subtitle')}</p>
      </div>
      {unread > 0 && (
        <Button variant="ghost" onClick={markAll}>
          <Icon name="check" /> {t('notifications:markAll')}
        </Button>
      )}
    </div>
  )

  if (loading && items.length === 0) {
    return (
      <div>
        {head}
        <Card>
          <div style={{ padding: 22 }}>
            <Skeleton h={64} r={12} />
          </div>
        </Card>
      </div>
    )
  }

  const sections = [
    ['today', groups.today],
    ['week', groups.week],
    ['older', groups.older],
  ].filter(([, rows]) => rows.length > 0)

  return (
    <div>
      {head}

      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={!onlyNew}
          className={!onlyNew ? styles.on : ''}
          onClick={() => setOnlyNew(false)}
        >
          {t('notifications:all')}
        </button>
        <button
          role="tab"
          aria-selected={onlyNew}
          className={onlyNew ? styles.on : ''}
          onClick={() => setOnlyNew(true)}
          data-only-new
        >
          {t('notifications:unreadTab', { count: unread })}
        </button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="bell"
            title={onlyNew ? t('notifications:allReadTitle') : t('notifications:emptyTitle')}
          >
            <p>{onlyNew ? t('notifications:allReadBody') : t('notifications:emptyBody')}</p>
          </EmptyState>
        </Card>
      ) : (
        sections.map(([key, rows]) => (
          <section key={key} className={styles.section}>
            <h2>{t(`notifications:groups.${key}`)}</h2>
            <Card className={styles['section-card']}>
              {rows.map((n) => (
                <NotificationRow key={n.id} item={n} />
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  )
}
