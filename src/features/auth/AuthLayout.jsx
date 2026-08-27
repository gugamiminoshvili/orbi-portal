import { useTranslation } from 'react-i18next'
import { LANGS, setLang } from '../../i18n'
import logo from '../../assets/orbi-logo.svg'
import styles from './Auth.module.css'

// Contact details as published on myorbi.orbi.ge's own signed-out footer.
// FLAG: copied from there rather than supplied — worth confirming before
// this reaches customers, since a wrong number here is a dead end.
const PHONE = '(995) 595 07 19 31'
const EMAIL = 'orbibilling@orbigroup.net'

// The frame every signed-out screen shares: brand and language switch on
// top, the screen's own form in the middle, contact details underneath, and
// a brand panel filling the right half on a wide window.
export default function AuthLayout({ children }) {
  const { t, i18n } = useTranslation()

  return (
    <div className={styles.shell}>
      <div className={styles.side}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            {/* alt is empty: the wordmark beside it already says ORBI. */}
            <img src={logo} alt="" className={styles.logo} />
            <div>
              <b>ORBI</b>
              <span>{t('common:ownerPortal')}</span>
            </div>
          </div>
          <div className={styles.langs}>
            {LANGS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`${styles.lang} ${lang.code === i18n.language ? styles.on : ''}`}
                aria-pressed={lang.code === i18n.language}
                onClick={() => setLang(lang.code)}
              >
                {lang.short || lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.card}>{children}</div>
        </div>

        <div className={styles.foot}>
          <div className={styles.contact}>
            <a href={`tel:${PHONE.replace(/[^\d+]/g, '')}`}>{PHONE}</a>
            <span aria-hidden="true">·</span>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </div>
          <span>© ORBI Group</span>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles['panel-inner']}>
          <h2>{t('auth:panelTitle')}</h2>
          <p>{t('auth:panelBody')}</p>
        </div>
        <img src={logo} alt="" aria-hidden="true" className={styles['panel-mark']} />
      </div>
    </div>
  )
}
