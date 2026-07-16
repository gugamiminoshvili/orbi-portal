import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { fmt } from '../../../utils/format'
import Icon from '../../../components/ui/Icon'
import Button from '../../../components/ui/Button'
import buttonStyles from '../../../components/ui/Button.module.css'
import Badge from '../../../components/ui/Badge'
import ServiceShell, { Metric } from './ServiceShell'
import ElectricityReportModal from '../modals/ElectricityReportModal'
import styles from '../Detail.module.css'

const STATUS_TONE = { Active: 'pos', Suspended: 'warn' }
const STATUS_KEY = { Active: 'active', Suspended: 'suspended', Inactive: 'inactive' }

// Ported from svcElectricity() at reference/orbi-portal-redesign.html lines 1375-1386.
export default function ElectricityCard({ apt }) {
  const { t } = useTranslation()
  const { openModal } = useModal()
  const s = apt.services.electricity
  const neg = s.balance < 0
  const tone = STATUS_TONE[s.status] || 'muted'
  const statusLabel = STATUS_KEY[s.status] ? t(`apartments:${STATUS_KEY[s.status]}`) : s.status

  return (
    <ServiceShell
      icon="bolt"
      iconBg="var(--warn-bg)"
      iconColor="var(--warn-ink)"
      name={t('apartments:electricityName')}
      sub={t('apartments:electricitySub')}
      right={
        <Metric label={t('apartments:balance')}>
          <span className={`${styles.money} ${neg ? styles.neg : styles.pos}`}>{fmt(neg ? s.balance : 0)}</span>
        </Metric>
      }
    >
      <div className={styles['svc-grid']} style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:counterId')}</div>
          <div className={styles.v}>{s.counter}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:status')}</div>
          <div className={styles.v}>
            <Badge tone={tone} dot>{statusLabel}</Badge>
          </div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:balance')}</div>
          <div className={`${styles.v} ${styles.money} ${neg ? styles.neg : styles.pos}`}>{fmt(s.balance)}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:lastUpdate')}</div>
          <div className={styles.v}>{s.updated}</div>
        </div>
      </div>
      <div className={styles['svc-cta']}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openModal(<ElectricityReportModal apartment={apt} />, { size: 'md' })}
        >
          <Icon name="doc" /> {t('apartments:electricityReports')}
        </Button>
        {neg && (
          <Link to={`/pay/${apt.id}`} className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${buttonStyles['btn-sm']}`}>
            {t('apartments:payAmount', { amount: fmt(-s.balance) })}
          </Link>
        )}
      </div>
    </ServiceShell>
  )
}
