import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { getNews, listNews } from '../../api/endpoints/news'
import { ph } from '../../utils/placeholder'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Chip } from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import NewsCard from './NewsCard'
import { NewsDetailSkeleton } from './NewsSkeletons'
import styles from './News.module.css'

const ATTACHMENTS = [
  { name: 'official_notice_2026.pdf', size: 'PDF · 248 KB' },
  { name: 'updated_house_rules.pdf', size: 'PDF · 512 KB' },
]

const CRUMB_TITLE_MAX = 34

export default function NewsDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const toast = useToast()

  const { data: item, loading: itemLoading } = useAsync(() => getNews(Number(id)), [id])
  const { data: allNews, loading: listLoading } = useAsync(listNews, [])

  // getNews() resolves undefined for unknown ids — treat that as not-found
  // instead of leaving the skeleton up forever.
  const notFound = !itemLoading && !item
  const loading = !notFound && (itemLoading || listLoading || !item)

  useCrumbs(
    item
      ? [
          { label: t('common:home'), to: '/' },
          { label: t('common:news'), to: '/news' },
          { label: item.title.length > CRUMB_TITLE_MAX ? `${item.title.slice(0, CRUMB_TITLE_MAX)}…` : item.title },
        ]
      : [{ label: t('common:home'), to: '/' }, { label: t('common:news'), to: '/news' }]
  )

  const backLink = (
    <Link to="/news" className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`} style={{ marginBottom: 18 }}>
      <Icon name="back" /> {t('news:backToNews')}
    </Link>
  )

  if (notFound) {
    return (
      <div>
        {backLink}
        <Card className={styles.article}>
          <EmptyState title={t('news:notFound')}>
            <p>
              <Link to="/news" style={{ color: 'var(--teal-ink)', fontWeight: 600 }}>
                {t('news:backToNews')}
              </Link>
            </p>
          </EmptyState>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        {backLink}
        <NewsDetailSkeleton />
      </div>
    )
  }

  // listNews() resolves a plain array in mock mode but `{items,count,next}`
  // in real mode (server-paginated) — normalize to an array either way.
  const relatedSource = Array.isArray(allNews) ? allNews : allNews?.items || []
  const related = relatedSource
    .filter((n) => n.id !== item.id && n.cat === item.cat)
    .slice(0, 3)

  const minutes = parseInt(item.read, 10) || 0

  return (
    <div>
      {backLink}
      <article className={styles.article}>
        <header className={styles['article-head']}>
          <div className={styles.meta}>
            <Chip>{t(`news:cats.${item.cat}`)}</Chip>
            <span><Icon name="cal" /> {item.date}</span>
            <span><Icon name="clock" /> {t('news:minRead', { count: minutes })}</span>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" onClick={() => toast(t('news:shareToast'))}>
              <Icon name="share" /> {t('news:share')}
            </Button>
          </div>
          <h1>{item.title}</h1>
        </header>

        <div className={styles['detail-hero']}>
          <img src={ph(item.seed, 1200, 600)} alt="" />
        </div>

        <div className={styles.prose}>
          <p><strong>{item.excerpt}</strong></p>
          <p>{t('news:article.intro')}</p>
          <h3>{t('news:article.whatsChanging')}</h3>
          <p>{t('news:article.whatsChangingBody', { section: t('common:myApartments') })}</p>
          <ul>
            <li>{t('news:article.list1')}</li>
            <li>{t('news:article.list2')}</li>
            <li>{t('news:article.list3')}</li>
          </ul>
          <h3>{t('news:article.whatToDo')}</h3>
          <p>{t('news:article.whatToDoBody')}</p>
        </div>

        <Card style={{ marginTop: 26 }}>
          <Card.Pad>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>{t('news:attachments')}</h3>
            {ATTACHMENTS.map((a) => (
              <div
                key={a.name}
                className={styles.attach}
                onClick={() => toast(t('news:downloading', { name: a.name }))}
              >
                <div className={styles.ico}>
                  <Icon name="doc" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.nm}>{a.name}</div>
                  <div className={styles.sz}>{a.size}</div>
                </div>
                <Button variant="soft" size="sm">
                  <Icon name="dl" /> {t('common:download')}
                </Button>
              </div>
            ))}
          </Card.Pad>
        </Card>
      </article>

      {related.length > 0 && (
        <section className={styles['related-wrap']}>
          <div className={styles['rl-head']}>
            <h3>{t('news:related')}</h3>
            <Link to="/news" className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}>
              {t('news:viewAll')} <Icon name="arrow" />
            </Link>
          </div>
          <div className={styles['news-grid']}>
            {related.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
