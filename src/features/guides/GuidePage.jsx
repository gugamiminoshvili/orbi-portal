import { Fragment } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { guideBySlug } from './guidesContent'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import styles from './Guides.module.css'

// The posters this content came from carried their own ქარ/ENG/РУС pills; here
// the portal's global language menu drives it, so a guide string is just the
// field for the active i18next language. `ka` is the fallback — it's the
// authored original, and an unexpected language code should still show the
// rule rather than nothing.
function pick(value, lang) {
  if (!value) return ''
  return value[lang] ?? value.ka ?? ''
}

// `**bold**` -> <strong>. The source posters used inline <strong>; splitting on
// the marker keeps this a plain React tree, so no guide string is ever handed
// to dangerouslySetInnerHTML.
function RichText({ children }) {
  const parts = String(children).split('**')
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  )
}

export default function GuidePage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const guide = guideBySlug(slug)

  useCrumbs(
    guide
      ? [{ label: t('common:home'), to: '/' }, { label: pick(guide.title, lang) }]
      : [{ label: t('common:home'), to: '/' }]
  )

  // An unknown slug can only come from a hand-typed URL — send it to the first
  // guide rather than rendering an error page for a static content route.
  if (!guide) return <Navigate to="/guides/handover" replace />

  return (
    <div>
      <div className={styles['page-head']}>
        <div className={styles.kicker}>{pick(guide.category, lang)}</div>
        <h1>{pick(guide.title, lang)}</h1>
        <p className={styles.lead}>{pick(guide.intro, lang)}</p>
      </div>

      {guide.stats && (
        <div className={styles.stats}>
          {guide.stats.map((s, i) => (
            <div key={i} className={styles.stat}>
              <b>{s.value}</b>
              <span>{pick(s.label, lang)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Columns come from the guide, matching each poster's own .grid rule
          (handover was three-up, the rest two-up). Sections marked `wide`
          span the whole row, exactly as the posters' .wide blocks did. */}
      <div className={styles.sections} style={{ '--cols': guide.columns }}>
        {guide.sections.map((section, i) => (
          <Card key={i} className={`${styles.section} ${section.wide ? styles['sec-wide'] : ''}`}>
            <span className={styles['sec-n']} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className={styles['sec-head']}>
              <span className={styles['sec-ic']}>
                <Icon name={section.icon} />
              </span>
              <h2>{pick(section.title, lang)}</h2>
            </div>

            {section.text && (
              <p className={styles.body}>
                <RichText>{pick(section.text, lang)}</RichText>
              </p>
            )}

            {section.list && (
              <ul className={styles.list}>
                {section.list.map((item, n) => (
                  <li key={n}>
                    <span className={styles.tick} aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    <span>
                      <RichText>{pick(item, lang)}</RichText>
                      {item.tag && <span className={styles.tag}>{item.tag}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {section.split && <Split split={section.split} lang={lang} />}

            {section.pairs && (
              <dl className={styles.pairs}>
                {section.pairs.map((pair, n) => (
                  <div
                    key={n}
                    className={`${styles.pair} ${pair.wide ? styles.wide : ''}`}
                  >
                    <dt>{pick(pair.label, lang)}</dt>
                    <dd>{pick(pair.value, lang)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {section.steps && (
              <ol className={styles.steps}>
                {section.steps.map((step, n) => (
                  <li key={n} className={styles.step}>
                    <span className={styles['step-n']}>{n + 1}</span>
                    <h3>{pick(step.title, lang)}</h3>
                    <p>{pick(step.text, lang)}</p>
                  </li>
                ))}
              </ol>
            )}

            {section.footnote && <p className={styles.footnote}>{pick(section.footnote, lang)}</p>}
          </Card>
        ))}
      </div>

      {guide.note && (
        <div className={styles.note} role="note">
          <Icon name="warn" />
          <p>
            <RichText>{pick(guide.note, lang)}</RichText>
          </p>
        </div>
      )}

      {guide.banner && (
        <div className={styles.banner}>
          <Icon name="chat" />
          <p>{pick(guide.banner, lang)}</p>
        </div>
      )}

      <div className={styles.foot}>
        <Icon name="help" />
        <span>{pick(guide.footer, lang)}</span>
      </div>
    </div>
  )
}

// The 91/9 revenue split. Percentages come from the content, not the
// stylesheet, so a future change to the commission is a one-line content edit.
function Split({ split, lang }) {
  const ownerPct = split.ownerPct
  return (
    <>
      <div className={styles.split} role="img" aria-label={pick(split.owner, lang)}>
        <div className={styles.a} style={{ flexBasis: `${ownerPct}%` }}>
          {pick(split.owner, lang)}
        </div>
        <div className={styles.b} style={{ flexBasis: `${100 - ownerPct}%` }}>
          {100 - ownerPct}%
        </div>
      </div>
      <div className={styles.legend}>
        {split.legend.map((entry, i) => (
          <span key={i}>
            <i className={i === 0 ? styles.dotA : styles.dotB} />
            {pick(entry, lang)}
          </span>
        ))}
      </div>
    </>
  )
}
