import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { RULES_DOCS, DOC_LANGS, defaultDocLang, formatMb } from './rulesDocs'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
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
        <HeroArt />
      </Card>

      <div className={styles['list-head']}>
        <div>
          <h2>{t('rules:availableTitle')}</h2>
          <p>{t('rules:availableSub')}</p>
        </div>
        <div className={styles.notice}>
          <Icon name="help" />
          <span>
            <b>{t('rules:noticeTitle')}</b>
            {t('rules:noticeBody')}
          </span>
        </div>
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

// Decorative banner art: a shield over a skyline, in the theme's own tokens.
function HeroArt() {
  return (
    <svg className={styles['hero-art']} viewBox="0 0 460 200" aria-hidden="true">
      <path d="M0 168c60-10 96-46 150-46s84 30 140 30 96-34 170-24v72H0z" fill="var(--teal-soft)" />
      <g fill="var(--teal-soft)" opacity=".85">
        <rect x="286" y="52" width="34" height="116" rx="3" />
        <rect x="330" y="80" width="26" height="88" rx="3" />
        <rect x="366" y="34" width="38" height="134" rx="3" />
        <rect x="412" y="72" width="26" height="96" rx="3" />
      </g>
      <g fill="var(--card)" opacity=".7">
        <rect x="294" y="62" width="6" height="8" /><rect x="306" y="62" width="6" height="8" />
        <rect x="294" y="80" width="6" height="8" /><rect x="306" y="80" width="6" height="8" />
        <rect x="374" y="46" width="7" height="9" /><rect x="389" y="46" width="7" height="9" />
        <rect x="374" y="66" width="7" height="9" /><rect x="389" y="66" width="7" height="9" />
      </g>
      <path
        d="M232 26l52 18v46c0 34-22 58-52 70-30-12-52-36-52-70V44z"
        fill="var(--teal)"
      />
      <path
        d="m210 92 16 16 30-32"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M96 150c-14-10-18-30-8-44 8 14 18 20 24 24-6 6-12 14-16 20z" fill="var(--teal-soft)" />
      <path d="M140 156c-10-16-6-36 6-44 2 16 8 24 12 30-6 4-14 10-18 14z" fill="var(--teal-soft)" />
    </svg>
  )
}
