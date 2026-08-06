import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../../context/ToastContext'
import { fmt } from '../../../utils/format'
import { amountOwed, balanceTone, owes } from '../../../utils/balance'
import Icon from '../../../components/ui/Icon'
import Button from '../../../components/ui/Button'
import buttonStyles from '../../../components/ui/Button.module.css'
import ServiceShell, { Metric } from './ServiceShell'
import styles from '../Detail.module.css'

// Ported from svcMaintenance() at reference/orbi-portal-redesign.html lines 1354-1364.
export default function MaintenanceCard({ apt }) {
  const { t } = useTranslation()
  const toast = useToast()
  const s = apt.services.maintenance
  // Positive balance = owed (utils/balance.js). The header metric shows the
  // amount due and nothing when settled; the cell below always shows the
  // real balance, so an advance stays visible as a green negative figure.
  const due = owes(s.balance)
  const tone = balanceTone(s.balance)
  // Maintenance is billed in the contract currency (live USD, mock GEL) —
  // the adapter reports the symbol alongside the balance.
  const cur = s.currency || '₾'

  return (
    <ServiceShell
      icon="wrench"
      iconBg="var(--teal-soft)"
      iconColor="var(--teal-ink)"
      name={t('apartments:maintenanceName')}
      sub={t('apartments:maintenanceSub')}
      right={
        <Metric label={t('apartments:balance')}>
          <span className={`${styles.money} ${styles[tone]}`}>{fmt(amountOwed(s.balance), cur)}</span>
        </Metric>
      }
    >
      <div className={styles['svc-grid']}>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:balance')}</div>
          <div className={`${styles.v} ${styles.money} ${styles[tone]}`}>{fmt(s.balance, cur)}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:monthlyTariff')}</div>
          {/* null (not 0) when the payload carries no tariff — see
              adaptServicesFromProperty. */}
          <div className={styles.v}>{s.tariff != null ? fmt(s.tariff, cur) : '-'}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:serviceStartDate')}</div>
          <div className={styles.v}>{s.start}</div>
        </div>
      </div>
      <div className={styles['svc-cta']}>
        <Button variant="ghost" size="sm" onClick={() => toast(t('apartments:invoiceDownloaded'))}>
          <Icon name="dl" /> {t('apartments:downloadInvoice')}
        </Button>
        {due && (
          <Link
            to={`/pay/${apt.id}`}
            state={{ apartmentCode: apt.code, utility: 'maintenance' }}
            className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}
          >
            {t('apartments:payAmount', { amount: fmt(s.balance, cur) })}
          </Link>
        )}
      </div>
    </ServiceShell>
  )
}
