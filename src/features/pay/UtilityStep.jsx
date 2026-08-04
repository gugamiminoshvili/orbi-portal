import { useTranslation } from 'react-i18next'
import { utilityCardData } from './payFlowData'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import cardStyles from '../../components/ui/Card.module.css'
import { Banner } from './ComplexStep'
import styles from './PayFlow.module.css'

// Same icon/color pairing MaintenanceCard/ElectricityCard/InternetCard use
// on the apartment detail page, so a utility reads the same way everywhere.
const UTILITY_ICON = {
  maintenance: { icon: 'wrench', bg: 'var(--teal-soft)', color: 'var(--teal-ink)' },
  electricity: { icon: 'bolt', bg: 'var(--warn-bg)', color: 'var(--warn-ink)' },
  internettv: { icon: 'wifi', bg: 'var(--violet-bg)', color: 'var(--violet-ink)' },
}

// Step 2: pick which utility type to pay across multiple apartments of the
// already-selected complex. Each card shows how many apartments in this
// complex currently owe something for that utility.
export default function UtilityStep({ complex, usdRate, maintenanceCurrency, onBack, onSelect }) {
  const { t } = useTranslation()
  const cards = utilityCardData(complex.apartments, usdRate, maintenanceCurrency)

  return (
    <>
      <div className={styles['back-row']}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <Icon name="back" /> {t('common:back')}
        </Button>
      </div>
      <Banner title={t('pay:utilityBannerTitle')} body={t('pay:utilityBannerBody')} />
      <div className={styles['utility-grid']}>
        {cards.map(({ utility, unpaidCount }) => {
          const cfg = UTILITY_ICON[utility]
          return (
            <button
              key={utility}
              type="button"
              className={`${cardStyles.card} ${styles['utility-card']}`}
              onClick={() => onSelect(utility)}
            >
              <div className={styles['utility-ic']} style={{ background: cfg.bg, color: cfg.color }}>
                <Icon name={cfg.icon} />
              </div>
              <h3>{t(`pay:utilityLabels.${utility}`)}</h3>
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                {t('pay:owingApartmentsCount', { count: unpaidCount })}
              </span>
              <span className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}>
                {t('pay:select')} <Icon name="arrow" />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
