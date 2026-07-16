import { useTranslation } from 'react-i18next'
import { useToast } from '../../../context/ToastContext'
import Icon from '../../../components/ui/Icon'
import buttonStyles from '../../../components/ui/Button.module.css'
import styles from '../Detail.module.css'

// Ported from svcDoors() at reference/orbi-portal-redesign.html lines 1424-1433.
// Unlike the other cards this row does not expand — it opens a calendar
// (stubbed with a toast until Task 13 builds the real modal).
export default function DoorsCard({ apt }) {
  const { t } = useTranslation()
  const toast = useToast()

  return (
    <article className={styles.svc}>
      <button
        type="button"
        className={styles['svc-head']}
        onClick={() => toast(t('apartments:openCalendarToast', { code: apt.code }))}
      >
        <div className={styles['svc-ic']} style={{ background: '#eef0f6', color: 'var(--ink-2)' }}>
          <Icon name="door" />
        </div>
        <div className={styles['svc-tt']}>
          <div className={styles['svc-name']}>{t('apartments:doorsName')}</div>
          <div className={styles['svc-sub']}>{t('apartments:doorsSub')}</div>
        </div>
        <div className={styles['svc-actions']}>
          <span className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}>
            {t('apartments:openCalendar')} <Icon name="arrow" />
          </span>
        </div>
      </button>
    </article>
  )
}
