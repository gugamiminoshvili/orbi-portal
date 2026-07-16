import { useTranslation } from 'react-i18next'
import ServiceShell, { Metric } from './ServiceShell'
import styles from '../Detail.module.css'

// Ported from svcWater() at reference/orbi-portal-redesign.html lines 1365-1374.
export default function WaterCard({ apt }) {
  const { t } = useTranslation()
  const s = apt.services.water

  return (
    <ServiceShell
      icon="drop"
      iconBg="var(--info-bg)"
      iconColor="var(--info-ink)"
      name={t('apartments:waterName')}
      sub={t('apartments:waterSub')}
      right={<Metric label={t('apartments:indication')}>{s.indication}</Metric>}
    >
      <div className={styles['svc-grid']}>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:counterId')}</div>
          <div className={styles.v}>{s.counter}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:indication')}</div>
          <div className={styles.v}>{s.indication}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>{t('apartments:lastUpdate')}</div>
          <div className={styles.v}>{s.updated}</div>
        </div>
      </div>
    </ServiceShell>
  )
}
