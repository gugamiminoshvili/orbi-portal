import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cardStyles from '../../components/ui/Card.module.css'
import { Chip } from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { USE_MOCK } from '../../api/client'
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
        {/* Real articles carry `featured_image` (item.img) — the seeded
            placeholder covers missing/broken images. Mock keeps the
            placeholder-only look. */}
        <img
          src={!USE_MOCK && item.img ? item.img : ph(item.seed, 640, 360)}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = ph(item.seed, 640, 360)
          }}
        />
        {/* No category field on the live API — item.cat is a fabricated
            fallback in real mode, so the chip is mock-only. */}
        {USE_MOCK && (
          <div className={styles.cat}>
            <Chip>{t(`news:cats.${item.cat}`)}</Chip>
          </div>
        )}
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
