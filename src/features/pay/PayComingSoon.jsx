import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'

// Placeholder for the `/pay` multi-payment flow entry point (Task P3-3
// replaces this with the real 3-step flow — ComplexStep/UtilityStep/
// ApartmentsStep). Exists only so the Dashboard's Pay Now / bottom action
// card links to a real route instead of falling through the catch-all.
export default function PayComingSoon() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home'), to: '/dashboard' }, { label: t('common:pay') }])

  return (
    <div>
      <Card>
        <EmptyState icon="wallet" title={t('pay:comingSoonTitle')}>
          <p>{t('pay:comingSoonBody')}</p>
        </EmptyState>
      </Card>
    </div>
  )
}
