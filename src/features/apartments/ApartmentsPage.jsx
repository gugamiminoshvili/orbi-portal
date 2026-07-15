import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { listApartments } from '../../api/endpoints/apartments'
import { blockGrad } from '../../api/mock/apartments'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import { Seg } from '../../components/ui/Badge'
import cardStyles from '../../components/ui/Card.module.css'
import ApartmentCard from './ApartmentCard'
import styles from './Apartments.module.css'

const ROLES = ['All', 'Owner', 'Trusted']

// Mirrors the `apartments` route at reference lines 1209-1263: role filter
// segment + apartments grouped by project, each group rendered as a grid of cards.
export default function ApartmentsPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home'), to: '/' }, { label: t('common:myApartments') }])

  const { data: apartments, loading } = useAsync(listApartments, [])
  const [role, setRole] = useState('All')

  const roleOptions = ROLES.map((r) => ({ value: r, label: t(`apartments:roles.${r}`) }))

  const items = (apartments || []).filter((a) => role === 'All' || a.role === role)

  // group by project, preserving first-seen order (mirrors the groups={} /
  // Object.keys(groups) iteration in paintApts()).
  const groups = []
  const byProject = new Map()
  for (const a of items) {
    let group = byProject.get(a.project)
    if (!group) {
      group = { project: a.project, items: [] }
      byProject.set(a.project, group)
      groups.push(group)
    }
    group.items.push(a)
  }

  return (
    <div>
      <div className={styles['page-head']}>
        <div>
          <h1>{t('apartments:title')}</h1>
          <p>{t('apartments:subtitle')}</p>
        </div>
      </div>

      <Seg
        className={styles['role-seg']}
        options={roleOptions}
        value={role}
        onChange={setRole}
        role="tablist"
        aria-label={t('apartments:filterAria')}
      />

      {loading ? (
        <ApartmentsSkeleton />
      ) : !apartments?.length ? (
        <Card>
          <EmptyState icon="home" title={t('apartments:emptyTitle')}>
            <p>{t('apartments:emptyHint')}</p>
          </EmptyState>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="home" title={t('apartments:emptyRoleTitle')}>
            <p>{t('apartments:emptyRoleHint')}</p>
          </EmptyState>
        </Card>
      ) : (
        groups.map((g) => (
          <div key={g.project} className={styles['proj-group']}>
            <div className={styles['proj-head']}>
              <div className={styles['pj-ic']} style={{ background: blockGrad(g.items[0]) }}>
                <Icon name="building" />
              </div>
              <h2>{g.project}</h2>
              <span className={styles.count}>{t('apartments:unit', { count: g.items.length })}</span>
            </div>
            <div className={styles['apt-grid']}>
              {g.items.map((a) => (
                <ApartmentCard key={a.id} apt={a} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Mirrors skApt() at reference lines 1060-1063 — one project group, 3 skeleton cards.
function ApartmentsSkeleton() {
  return (
    <div className={styles['proj-group']}>
      <div className={styles['proj-head']}>
        <Skeleton w={34} h={34} r={10} />
        <Skeleton h={18} w={120} />
      </div>
      <div className={styles['apt-grid']}>
        {Array.from({ length: 3 }, (_, i) => (
          <ApartmentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function ApartmentCardSkeleton() {
  return (
    <div className={`${cardStyles.card} ${styles['apt-card']}`}>
      <div className={styles.top}>
        <Skeleton w={54} h={54} r={13} />
        <div className={styles.hd} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton h={18} w="80%" />
          <Skeleton h={20} w={70} r={999} />
        </div>
      </div>
      <div className={styles.metarow}>
        <div className={styles.m}>
          <Skeleton h={11} w="60%" style={{ marginBottom: 6 }} />
          <Skeleton h={14} w="40%" />
        </div>
        <div className={styles.m}>
          <Skeleton h={11} w="60%" style={{ marginBottom: 6 }} />
          <Skeleton h={14} w="40%" />
        </div>
        <div className={styles.m}>
          <Skeleton h={11} w="60%" style={{ marginBottom: 6 }} />
          <Skeleton h={14} w="40%" />
        </div>
      </div>
      <div className={styles.hint}>
        <Skeleton h={36} style={{ width: '100%', borderRadius: 9 }} />
      </div>
    </div>
  )
}
