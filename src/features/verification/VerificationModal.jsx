import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { uploadPassport } from '../../api/endpoints/passport'
import {
  PASSPORT_ACCEPT,
  checkPassportFile,
  formatBytes,
} from '../../utils/passportFile'
import { REASONS, SUPPORT_DISPLAY, whatsappLink } from './reasons'
import Icon from '../../components/ui/Icon'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Verification.module.css'

// The verification dialog, built to the approved prototype
// (orbi-passport-verification-v2-refined). Three surfaces behind one modal,
// exactly as the prototype's `view` switch does it: the state itself, the
// uploader, and the WhatsApp screen. Which of them a state can reach is the
// state's own business — see REASONS.
export default function VerificationModal({ reason = 'generic' }) {
  const [view, setView] = useState('modal')
  const [state, setState] = useState(reason)

  if (view === 'upload') {
    return (
      <UploadView
        onBack={() => setView('modal')}
        onDone={() => {
          // The prototype lands on its own confirmation rather than closing:
          // the owner has just been told to wait, and that needs saying.
          setState('submitted')
          setView('modal')
        }}
      />
    )
  }
  if (view === 'support') return <SupportView onBack={() => setView('modal')} />
  return <StateView reason={state} onGo={setView} />
}

// ---------------------------------------------------------------- state ---

function StateView({ reason, onGo }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const def = REASONS[reason] || REASONS.generic
  const items = t(`verification:reasons.${reason}.items`, { returnObjects: true })
  const labels = t(`verification:reasons.${reason}.buttons`, { returnObjects: true })

  return (
    <div className={`${styles.dialog} ${styles[def.tone]}`}>
      <CloseButton onClick={closeModal} />

      <div className={styles.body}>
        <span className={styles.icon}>
          <Icon name={def.icon} />
        </span>
        <h3 className={styles.title}>{t(`verification:reasons.${reason}.title`)}</h3>
        <p className={styles.desc}>{t(`verification:reasons.${reason}.desc`)}</p>

        {Array.isArray(items) && items.length > 0 && (
          <div className={styles.list}>
            <div className={styles['list-t']}>{t(`verification:reasons.${reason}.listTitle`)}</div>
            <ul>
              {items.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* A column, primary on top: the two do not carry equal weight — one
          resolves the reason, the other postpones it. */}
      <div className={styles.foot}>
        {def.actions.map((a, i) => (
          <button
            key={a.act}
            type="button"
            className={`${buttonStyles.btn} ${
              i === 0 ? buttonStyles['btn-primary'] : buttonStyles['btn-ghost']
            } ${styles.act}`}
            onClick={() => (a.act === 'close' ? closeModal() : onGo(a.act))}
          >
            {a.icon && <Icon name={a.icon} />}
            {Array.isArray(labels) ? labels[i] : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

// --------------------------------------------------------------- upload ---

function UploadView({ onBack, onDone }) {
  const { t } = useTranslation()
  const u = (k) => t(`verification:up.${k}`)
  const tips = t('verification:up.tips', { returnObjects: true })

  const [file, setFile] = useState(null)
  const [problem, setProblem] = useState(null) // 'type' | 'size' | 'failed'
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null) // null | 0..100
  // The preview URL is state, not a ref: it is rendered, and a ref read
  // during render would not re-run the render that needs it. The ref beside
  // it exists only so unmount can revoke whatever is current.
  const [url, setUrl] = useState(null)
  const fileRef = useRef(null)
  const camRef = useRef(null)
  const urlRef = useRef(null)

  // The object URL is the one thing here that leaks if it is not released.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  function take(picked) {
    if (!picked) return
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const next = URL.createObjectURL(picked)
    urlRef.current = next
    setUrl(next)
    setFile(picked)
    setProblem(checkPassportFile(picked))
  }

  function clear() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setUrl(null)
    setFile(null)
    setProblem(null)
    setProgress(null)
  }

  async function submit() {
    setProgress(0)
    setProblem(null)
    // The bar is honest about what it knows: it walks to 90 while the request
    // is in flight and only reaches 100 when the server has answered. A bar
    // that hits 100 before the response would be a lie told twice a second.
    const tick = setInterval(() => setProgress((p) => (p == null || p >= 90 ? p : p + 7)), 120)
    try {
      await uploadPassport(file)
      clearInterval(tick)
      setProgress(100)
      setTimeout(onDone, 450)
    } catch {
      clearInterval(tick)
      setProgress(null)
      setProblem('failed')
    }
  }

  const ext = String(file?.name || '').split('.').pop().toLowerCase()
  const drawable = ['jpg', 'jpeg', 'png'].includes(ext)
  const canSubmit = file && !problem && progress == null

  return (
    <div className={styles.dialog}>
      <div className={styles.head}>
        <button type="button" className={styles.back} aria-label={u('back')} onClick={onBack}>
          <Icon name="back" />
        </button>
        <div>
          <div className={styles['head-t']}>{u('title')}</div>
          <div className={styles['head-s']}>{u('sub')}</div>
        </div>
      </div>

      <div className={styles['up-body']}>
        {!file && (
          <div
            className={`${styles.dropzone} ${dragging ? styles.drag : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              take(e.dataTransfer.files?.[0])
            }}
          >
            <span className={styles['dz-ic']}>
              <Icon name="dl" />
            </span>
            <div className={styles['dz-t']}>{u('dzT')}</div>
            <div className={styles['dz-s']}>{u('dzH')}</div>
          </div>
        )}

        {!file && (
          <div className={styles['dz-actions']}>
            <button type="button" className={styles.ab} onClick={() => camRef.current?.click()}>
              <Icon name="camera" /> <span>{u('cam')}</span>
            </button>
            <button type="button" className={styles.ab} onClick={() => fileRef.current?.click()}>
              <Icon name="folder" /> <span>{u('gal')}</span>
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={PASSPORT_ACCEPT}
          hidden
          onChange={(e) => take(e.target.files?.[0])}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => take(e.target.files?.[0])}
        />

        {file && (
          <div className={styles['pv-card']}>
            <span className={`${styles['pv-thumb']} ${drawable ? '' : styles.doc}`}>
              {drawable ? (
                <img src={url} alt="" />
              ) : (
                <span className={styles['pv-doc']}>{ext || 'file'}</span>
              )}
            </span>
            <span className={styles['pv-meta']}>
              <span className={styles['pv-name']}>{file.name}</span>
              <span className={styles['pv-size']}>{formatBytes(file.size)}</span>
            </span>
            <button
              type="button"
              className={styles['pv-remove']}
              aria-label={u('remove')}
              onClick={clear}
            >
              <Icon name="trash" />
            </button>
          </div>
        )}

        {/* Shown only when the picked file fails, so the reason stays visible
            beside the three tips rather than replacing them. */}
        {problem && (
          <div className={styles.uperr}>
            <Icon name="warn" />
            <span>
              {problem === 'type' ? u('eType') : problem === 'size' ? u('eSize') : u('eFailed')}
            </span>
          </div>
        )}

        <ol className={styles.tips}>
          {(Array.isArray(tips) ? tips : []).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>

        {progress != null && (
          <div className={styles.progress}>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.pt}>{progress >= 100 ? u('done') : u('loading')}</div>
          </div>
        )}
      </div>

      <div className={styles.foot}>
        <button
          type="button"
          className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles.act}`}
          disabled={!canSubmit}
          onClick={submit}
        >
          {u('submit')}
        </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------- support ---

function SupportView({ onBack }) {
  const { t } = useTranslation()
  const s = (k) => t(`verification:sup.${k}`)

  return (
    <div className={styles.dialog}>
      <div className={styles.head}>
        <button type="button" className={styles.back} aria-label={t('verification:up.back')} onClick={onBack}>
          <Icon name="back" />
        </button>
        <div>
          <div className={styles['head-t']}>{s('title')}</div>
        </div>
      </div>

      <div className={styles['sup-body']}>
        <span className={styles['wa-ic']}>
          <Icon name="whatsapp" />
        </span>
        <h3 className={styles.title}>{s('heading')}</h3>
        <p className={styles.desc}>{s('desc')}</p>

        <div className={styles.numcard}>
          <div>
            <div className={styles.nl}>{s('numLbl')}</div>
            <div className={styles.nv}>{SUPPORT_DISPLAY}</div>
          </div>
          <span className={styles['wa-mini']}>
            <Icon name="whatsapp" />
          </span>
        </div>

        <p className={styles['sup-note']}>{s('note')}</p>
      </div>

      <div className={styles.foot}>
        <a
          className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles.act}`}
          href={whatsappLink(t('verification:waMessage'))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="whatsapp" /> {s('connect')}
        </a>
      </div>
    </div>
  )
}

function CloseButton({ onClick }) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles.close} aria-label={t('common:close')} onClick={onClick}>
      <Icon name="close" />
    </button>
  )
}
