import { useTranslation } from 'react-i18next'
import { utilityCardData } from './payFlowData'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import cardStyles from '../../components/ui/Card.module.css'
import { InfoAlert } from './ComplexStep'
import { UTILITY_ICON } from './utilityIcons'
import styles from './PayFlow.module.css'

// Step 2: which utility to pay across the complex's apartments. Each row
// says how many apartments owe for it - red when any do.
export default function UtilityStep({ complex, usdRate, maintenanceCurrency, onSelect }) {
  const { t } = useTranslation()
  const cards = utilityCardData(complex.apartments, usdRate, maintenanceCurrency)

  return (
    <>
      <InfoAlert>{t('pay:utilityInfo')}</InfoAlert>
      <div className={styles['utility-list']}>
        {cards.map(({ utility, unpaidCount }) => {
          const cfg = UTILITY_ICON[utility]
          return (
            <button
              key={utility}
              type="button"
              className={`${cardStyles.card} ${styles['utility-row']}`}
              onClick={() => onSelect(utility)}
            >
              <span className={styles['utility-ic']} style={{ background: cfg.bg, color: cfg.color }}>
                <Icon name={cfg.icon} />
              </span>
              <span className={styles['utility-body']}>
                <b>{t(`pay:utilityLabels.${utility}`)}</b>
                <span className={unpaidCount > 0 ? styles.neg : ''}>
                  {unpaidCount > 0 ? t('pay:unpaidBillsCount', { count: unpaidCount }) : t('pay:noUnpaidBills')}
                </span>
              </span>
              <span className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['select-btn']}`}>
                {t('pay:select')} <Icon name="arrow" />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
