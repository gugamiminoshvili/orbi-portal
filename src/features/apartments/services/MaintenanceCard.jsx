import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../../context/ToastContext'
import { fmt } from '../../../utils/format'
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
  const neg = s.balance < 0

  return (
    <ServiceShell
      icon="wrench"
      iconBg="var(--teal-soft)"
      iconColor="var(--teal-ink)"
      name={t('apartments:maintenanceName')}
      sub={t('apartments:maintenanceSub')}
      right={
        <Metric label={t('apartments:balance')}>
          <span className={`${styles.money} ${neg ? styles.neg : styles.pos}`}>{fmt(neg ? s.balance : 0)}</span>
        </Metric>
      }
    >
      <div className={styles['svc-grid']}>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:balance')}</div>
          <div className={`${styles.v} ${styles.money} ${neg ? styles.neg : styles.pos}`}>{fmt(s.balance)}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:monthlyTariff')}</div>
          <div className={styles.v}>{fmt(s.tariff)}</div>
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
        {neg && (
          <Link
            to={`/pay/${apt.id}`}
            state={{ apartmentCode: apt.code, utility: 'maintenance' }}
            className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}
          >
            {t('apartments:payAmount', { amount: fmt(-s.balance) })}
          </Link>
        )}
      </div>
    </ServiceShell>
  )
}
