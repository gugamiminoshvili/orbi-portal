import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { RULES_DOCS, DOC_LANGS, defaultDocLang, formatMb } from './rulesDocs'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import banner from '../../assets/rules-banner.png'
import styles from './Rules.module.css'

export default function RulesPage() {
  const { t, i18n } = useTranslation()
  useCrumbs([{ label: t('rules:title') }])

  return (
    <div>
      <Card className={styles.hero}>
        <div className={styles['hero-body']}>
          <span className={styles['hero-ic']}>
            <Icon name="doc" />
          </span>
          <div>
            <h1>{t('rules:title')}</h1>
            <p>{t('rules:subtitle')}</p>
          </div>
        </div>
        {/* Decorative: the heading already says what this page is, so the
            art is hidden from assistive tech rather than described. */}
        <img src={banner} alt="" aria-hidden="true" className={styles['hero-art']} />
      </Card>

      <div className={styles['list-head']}>
        <h2>{t('rules:availableTitle')}</h2>
        <p>{t('rules:availableSub')}</p>
      </div>

      {/* Its own full-width row rather than squeezed beside the heading: it
          applies to both documents, so it reads in order — what this section
          is, what to know before opening it, then the documents. */}
      <div className={styles.notice}>
        <Icon name="info" />
        <span>
          <b>{t('rules:noticeTitle')}</b>
          {t('rules:noticeBody')}
        </span>
      </div>

      <div className={styles.grid}>
        {RULES_DOCS.map((doc) => (
          <DocCard key={doc.id} doc={doc} uiLang={i18n.language} />
        ))}
      </div>

      <Card className={styles.help}>
        <span className={styles['help-ic']}>
          <Icon name="chat" />
        </span>
        <div className={styles['help-body']}>
          <div className={styles['help-title']}>{t('rules:helpTitle')}</div>
          <div className={styles['help-sub']}>{t('rules:helpBody')}</div>
        </div>
        <Link
          to="/support"
          className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['help-btn']}`}
        >
          <Icon name="chat" /> {t('rules:contactCentre')}
        </Link>
      </Card>
    </div>
  )
}

function DocCard({ doc, uiLang }) {
  const { t } = useTranslation()
  // The chosen language is per-card: someone may want the Georgian text of
  // one document and the English of the other, and there is no reason to
  // make that choice once for the whole page.
  const [lang, setLang] = useState(() => defaultDocLang(uiLang))
  const file = doc.files[lang]

  return (
    <Card className={styles.doc} data-doc={doc.id}>
      <div className={styles['doc-head']}>
        <span className={`${styles['doc-ic']} ${styles[doc.tone]}`}>
          <Icon name={doc.icon} />
        </span>
        <div>
          <h3>{t(`rules:docs.${doc.id}.title`)}</h3>
          <p>{t(`rules:docs.${doc.id}.desc`)}</p>
        </div>
      </div>

      <div className={styles.file}>
        <span className={styles['file-ic']} aria-hidden="true">
          PDF
        </span>
        <div className={styles['file-meta']}>
          <div className={styles['file-name']}>{file.name}</div>
          <div className={styles['file-size']}>{formatMb(file.bytes)}</div>
        </div>
      </div>

      {/* Not decoration: picking a chip swaps which file the two buttons
          below point at. It is a radio group, so a screen reader hears one
          control with two options rather than two unrelated buttons. */}
      <div
        className={styles.langs}
        role="radiogroup"
        aria-label={t('rules:languageAria', { doc: t(`rules:docs.${doc.id}.title`) })}
      >
        {DOC_LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={code === lang}
            className={`${styles.lang} ${code === lang ? styles.on : ''}`}
            onClick={() => setLang(code)}
          >
            {t(`rules:langs.${code}`)}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        {/* Preview opens a tab; download saves. Both are plain links, so
            middle-click and "save as" behave the way the browser's own
            affordances promise. */}
        <a
          className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${styles.act}`}
          href={file.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('rules:preview')} <Icon name="eye" />
        </a>
        <a
          className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles.act}`}
          href={file.href}
          download={file.name}
        >
          <Icon name="dl" /> {t('rules:download')}
        </a>
      </div>
    </Card>
  )
}
