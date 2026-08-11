import { useTranslation } from 'react-i18next'
import { fmt } from '../../utils/format'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import EmptyState from '../../components/ui/EmptyState'
import styles from './PayFlow.module.css'

// Step 1: pick a complex. One row per project the resident has apartments
// in (buildComplexes' grouping) — apartment count, unpaid BILLS count (one
// apartment can contribute up to 3, one per utility), and the GEL
// outstanding total (maintenance already USD->GEL converted by owedFor).
export default function ComplexStep({ complexes, onSelect }) {
  const { t } = useTranslation()

  if (complexes.length === 0) {
    return (
      <Card>
        <EmptyState icon="wallet" title={t('pay:noOutstandingTitle')}>
          <p>{t('pay:noOutstandingBody')}</p>
        </EmptyState>
      </Card>
    )
  }

  return (
    <>
      <Banner title={t('pay:complexBannerTitle')} body={t('pay:complexBannerBody')} />
      <div className={styles['complex-list']}>
        {complexes.map((c) => (
          <Card key={c.project} className={styles['complex-row']}>
            <div className={styles['complex-icon']}>
              <Icon name="building" />
            </div>
            <div className={styles['complex-body']}>
              <h3>{c.project}</h3>
              <div className={styles['complex-meta']}>
                <span>{t('pay:apartmentsCount', { count: c.count })}</span>
                <span>·</span>
                <span>{t('pay:unpaidBillsCount', { count: c.unpaidBillsCount })}</span>
              </div>
            </div>
            <div className={styles['complex-total']}>{fmt(c.outstandingGEL, '₾')}</div>
            <Button size="sm" onClick={() => onSelect(c.project)}>
              {t('pay:select')} <Icon name="arrow" />
            </Button>
          </Card>
        ))}
      </div>
    </>
  )
}

export function Banner({ title, body }) {
  return (
    <div className={styles.banner}>
      <div className={styles.bi}>
        <Icon name="warn" size={16} />
      </div>
      <div>
        <h4>{title}</h4>
        <p>{body}</p>
      </div>
    </div>
  )
}
