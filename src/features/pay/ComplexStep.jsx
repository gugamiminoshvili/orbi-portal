import { useTranslation } from 'react-i18next'
import { fmt } from '../../utils/format'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import EmptyState from '../../components/ui/EmptyState'
import styles from './PayFlow.module.css'

// Step 1: pick a complex. One card per project the resident has apartments
// in (buildComplexes): apartment count, unpaid bills (one apartment can
// contribute up to 3, one per utility) and the outstanding debt in GEL.
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
      <InfoAlert>{t('pay:complexInfo')}</InfoAlert>
      <div className={styles['complex-list']}>
        {complexes.map((c) => {
          const owes = c.outstandingGEL > 0
          return (
            <Card key={c.project} className={styles['complex-row']}>
              <div className={styles['complex-icon']}>
                <Icon name="building" />
              </div>
              <div className={styles['complex-body']}>
                <h3>{c.project}</h3>
                <div className={styles['complex-meta']}>
                  <span className={styles['meta-apts']}>
                    <Icon name="building" size={13} /> {t('pay:apartmentsCount', { count: c.count })}
                  </span>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles['meta-bills']}>{t('pay:unpaidBillsCount', { count: c.unpaidBillsCount })}</span>
                </div>
              </div>
              {/* Phone: the bills count becomes a pill beside the button. */}
              <span className={`${styles['bills-pill']} ${c.unpaidBillsCount > 0 ? styles.neg : styles.pos}`}>
                <Icon name="doc" size={13} /> {t('pay:unpaidBillsCount', { count: c.unpaidBillsCount })}
              </span>
              <div className={styles['complex-total']}>
                <small>{t('pay:outstandingDebt')}</small>
                <b className={owes ? styles.neg : ''}>{fmt(c.outstandingGEL, '₾')}</b>
              </div>
              <Button className={styles['select-btn']} onClick={() => onSelect(c.project)}>
                {t('pay:select')} <Icon name="arrow" />
              </Button>
            </Card>
          )
        })}
      </div>
    </>
  )
}

// One-line info note above a step's list.
export function InfoAlert({ children }) {
  return (
    <div className={styles.info} role="note">
      <Icon name="info" size={17} />
      <span>{children}</span>
    </div>
  )
}
