import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cardStyles from '../../components/ui/Card.module.css'
import { Chip } from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { ph } from '../../utils/placeholder'
import styles from './News.module.css'

// Reusable card — used by the news list AND the detail page's "Related news"
// section, mirroring newsCardHtml() at reference lines 1107-1116.
export default function NewsCard({ item }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/news/${item.id}`}
      className={`${cardStyles.card} ${styles['news-card']}`}
      aria-label={item.title}
    >
      <div className={styles.thumb}>
        <img src={ph(item.seed, 640, 360)} alt="" loading="lazy" />
        <div className={styles.cat}>
          <Chip>{t(`news:cats.${item.cat}`)}</Chip>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <Icon name="cal" />
          <span>{item.date}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.excerpt}</p>
        <div className={styles.foot}>
          {t('news:readMore')} <Icon name="arrow" />
        </div>
      </div>
    </Link>
  )
}
