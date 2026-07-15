import Skeleton from '../../components/ui/Skeleton'
import cardStyles from '../../components/ui/Card.module.css'
import styles from './News.module.css'

// Mirrors skNewsGrid() at reference lines 1051-1055 — 9 shimmer cards while loading.
export function NewsCardSkeleton() {
  return (
    <div className={cardStyles.card}>
      <Skeleton style={{ aspectRatio: '16 / 9', borderRadius: '12px 12px 0 0' }} />
      <div className={styles.body}>
        <Skeleton h={12} w="45%" style={{ marginBottom: 6 }} />
        <Skeleton h={18} w="95%" />
        <Skeleton h={18} w="65%" />
        <Skeleton h={12} />
      </div>
    </div>
  )
}

export function NewsGridSkeleton({ count = 9 }) {
  return (
    <div className={styles['news-grid']}>
      {Array.from({ length: count }, (_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Mirrors the newsDetail loading markup at reference lines 1151-1158.
export function NewsDetailSkeleton() {
  return (
    <div className={styles.article}>
      <div className={styles['article-head']}>
        <Skeleton w={80} h={28} r={999} style={{ marginBottom: 14 }} />
        <Skeleton h={30} w="90%" style={{ marginBottom: 9 }} />
        <Skeleton h={30} w="60%" />
      </div>
      <Skeleton style={{ aspectRatio: '16 / 8', borderRadius: 16, marginBottom: 26 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} w="55%" style={{ marginBottom: 24 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
      <Skeleton h={12} style={{ marginBottom: 9 }} />
    </div>
  )
}
