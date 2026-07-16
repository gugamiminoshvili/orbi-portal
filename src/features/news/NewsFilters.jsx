import { useTranslation } from 'react-i18next'
import { Seg } from '../../components/ui/Badge'
import { SearchField } from '../../components/ui/Field'
import fieldStyles from '../../components/ui/Field.module.css'
import { CATS } from '../../api/mock/news'
import styles from './News.module.css'

// Toolbar: category segmented control + search + sort — mirrors the
// .news-toolbar markup at reference lines 1075-1088.
export default function NewsFilters({ cat, q, sort, onCatChange, onQChange, onSortChange }) {
  const { t } = useTranslation()
  const options = CATS.map((c) => ({ value: c, label: t(`news:cats.${c}`) }))

  return (
    <div className={styles['news-toolbar']}>
      <Seg
        options={options}
        value={cat}
        onChange={onCatChange}
        role="tablist"
        aria-label={t('news:filterAria')}
      />
      <div style={{ flex: 1 }} />
      <SearchField
        className={styles['search-box']}
        placeholder={t('news:searchPlaceholder')}
        aria-label={t('news:searchPlaceholder')}
        value={q}
        onChange={(e) => onQChange(e.target.value)}
      />
      <select
        className={`${fieldStyles.input} ${styles['sort-select']}`}
        style={{ width: 'auto' }}
        aria-label={t('news:sortAria')}
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="new">{t('news:newestFirst')}</option>
        <option value="old">{t('news:oldestFirst')}</option>
      </select>
    </div>
  )
}
