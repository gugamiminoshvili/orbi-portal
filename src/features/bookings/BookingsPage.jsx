import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import styles from './Bookings.module.css'

// Bookings and Visits (owner call 2026-08-07). Deliberately an empty shell:
// the route and the rail entry exist so the module has a home, but what the
// page actually does has not been specified yet. Whoever fills it in should
// delete this comment along with the placeholder.
export default function BookingsPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:bookingsVisits') }])

  return (
    <div>
      <div className={styles['page-head']}>
        <h1>{t('common:bookingsVisits')}</h1>
      </div>
      <Card>
        <EmptyState icon="cal" title={t('bookings:emptyTitle')}>
          <p>{t('bookings:emptyBody')}</p>
        </EmptyState>
      </Card>
    </div>
  )
}
