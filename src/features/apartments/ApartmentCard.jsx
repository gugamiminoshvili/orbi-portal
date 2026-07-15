import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cardStyles from '../../components/ui/Card.module.css'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { blockGrad, ROLE_STYLE } from '../../api/mock/apartments'
import styles from './Apartments.module.css'

// Mirrors aptCardHtml() at reference lines 1224-1242.
export default function ApartmentCard({ apt }) {
  const { t } = useTranslation()
  const rs = ROLE_STYLE[apt.role] || ROLE_STYLE.Owner

  return (
    <Link
      to={`/apartments/${apt.id}`}
      className={`${cardStyles.card} ${styles['apt-card']}`}
      aria-label={`${apt.code} — ${t('apartments:viewDetails')}`}
    >
      <div className={styles.top}>
        <div className={styles.bicon} style={{ background: blockGrad(apt) }}>
          <Icon name="building" />
        </div>
        <div className={styles.hd}>
          <div className={styles.code}>{apt.code}</div>
          <div className={styles.role}>
            <Badge dot style={{ background: rs.bg, color: rs.col }}>
              {t(`apartments:roles.${apt.role}`, apt.role)}
            </Badge>
          </div>
        </div>
      </div>
      <div className={styles.metarow}>
        <div className={styles.m}>
          <div className={styles.k}>{t('apartments:block')}</div>
          <div className={styles.v}>{apt.block}</div>
        </div>
        <div className={styles.m}>
          <div className={styles.k}>{t('apartments:number')}</div>
          <div className={styles.v}>{apt.number}</div>
        </div>
        <div className={styles.m}>
          <div className={styles.k}>{t('apartments:floor')}</div>
          <div className={styles.v}>{apt.floor}</div>
        </div>
      </div>
      <div className={styles.hint}>
        {t('apartments:viewDetails')}
        <span className={styles.arr}>
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  )
}
