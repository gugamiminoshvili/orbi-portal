import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { createTicket } from '../../api/endpoints/support'
import { SUPPORT_TOPICS } from '../../api/mock/tickets'
import { APTS, blockGrad } from '../../api/mock/apartments'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import { SearchField } from '../../components/ui/Field'
import buttonStyles from '../../components/ui/Button.module.css'
import fieldStyles from '../../components/ui/Field.module.css'
import styles from './Support.module.css'

// New-ticket form for /support/new. Mirrors supCreateHtml() at reference
// lines 1905-1957, with the topic picker inlined as a grid on the page
// itself (the modal from the prototype isn't ported — the brief's create
// flow only needs the grid to be visible immediately).
export default function NewTicketPane() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { bumpTicketsRefresh } = useOutletContext()

  const [topic, setTopic] = useState(null)
  const [apt, setApt] = useState(null)
  const [text, setText] = useState('')
  const [aptOpen, setAptOpen] = useState(false)
  const [aptQuery, setAptQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const comboRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (aptOpen && comboRef.current && !comboRef.current.contains(e.target)) setAptOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [aptOpen])

  const canSubmit = !!topic && text.trim().length > 0
  const selectedApt = apt ? APTS.find((a) => a.id === apt) : null
  const q = aptQuery.trim().toLowerCase()
  const filteredApts = q ? APTS.filter((a) => a.code.toLowerCase().includes(q)) : APTS
  const showGeneral = !q || 'general'.includes(q)

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const ticket = await createTicket({ topic, apt, text: text.trim() })
    setSubmitting(false)
    bumpTicketsRefresh()
    toast(t('support:createdToast', { id: ticket.id }))
    navigate(`/support/t/${ticket.id}`)
  }

  function handleAttach() {
    toast(t('support:attachToast'))
  }

  function openCombo() {
    setAptOpen((o) => !o)
    setAptQuery('')
  }

  return (
    <>
      <div className={styles['sup-dhead']}>
        <Link to="/support" className={styles['sup-back']} aria-label={t('common:back')}>
          <Icon name="back" />
        </Link>
        <div className={styles['dh-main']}>
          <h3>{t('support:newTicket')}</h3>
          <div className={styles['dh-sub']}>{t('support:newTicketSub')}</div>
        </div>
      </div>

      <div className={styles['sup-create-body']}>
        <div className={styles['sup-form']}>
          <div className={styles.field}>
            <label>
              {t('support:topic')} <span className={styles.req}>*</span>
            </label>
            <div className={styles['topic-grid']}>
              {SUPPORT_TOPICS.map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  className={`${styles['topic-card']} ${topic === tp.id ? styles.sel : ''}`}
                  onClick={() => setTopic(tp.id)}
                >
                  <span className={styles['tc-ic']} style={{ background: tp.tintBg, color: tp.tintCol }}>
                    <Icon name={tp.icon} />
                  </span>
                  <span className={styles['tc-t']}>{t(`support:topics.${tp.id}.label`)}</span>
                  <span className={styles['tc-d']}>{t(`support:topics.${tp.id}.desc`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>
              {t('support:apartment')} <span className={styles.optional}>{t('support:optional')}</span>
            </label>
            <div ref={comboRef} className={`${styles.combo} ${aptOpen ? styles.open : ''}`}>
              <button type="button" className={styles['combo-btn']} onClick={openCombo}>
                {selectedApt ? (
                  <>
                    <span className={styles['co-ic']} style={{ background: blockGrad(selectedApt) }}>
                      <Icon name="building" />
                    </span>
                    <b>{selectedApt.code}</b>
                  </>
                ) : (
                  <span>{t('support:generalOption')}</span>
                )}
                <span className={styles['cb-chev']}>
                  <Icon name="chevron" />
                </span>
              </button>
              {aptOpen && (
                <div className={styles['combo-panel']}>
                  <div className={styles['combo-search']}>
                    <SearchField
                      type="search"
                      value={aptQuery}
                      onChange={(e) => setAptQuery(e.target.value)}
                      placeholder={t('support:searchApartments')}
                      aria-label={t('support:searchApartments')}
                    />
                  </div>
                  <div className={styles['combo-opts']}>
                    {showGeneral && (
                      <div
                        className={`${styles['combo-opt']} ${styles.general} ${!apt ? styles.sel : ''}`}
                        onClick={() => {
                          setApt(null)
                          setAptOpen(false)
                        }}
                      >
                        <span className={styles['co-ic']}>
                          <Icon name="home" />
                        </span>
                        <span>
                          <div className={styles['co-t']}>{t('support:general')}</div>
                          <div className={styles['co-s']}>{t('support:generalHint')}</div>
                        </span>
                      </div>
                    )}
                    {filteredApts.map((a) => (
                      <div
                        key={a.id}
                        className={`${styles['combo-opt']} ${apt === a.id ? styles.sel : ''}`}
                        onClick={() => {
                          setApt(a.id)
                          setAptOpen(false)
                        }}
                      >
                        <span className={styles['co-ic']} style={{ background: blockGrad(a) }}>
                          <Icon name="building" />
                        </span>
                        <div className={styles['co-t']}>{a.code}</div>
                      </div>
                    ))}
                    {!showGeneral && filteredApts.length === 0 && (
                      <div className={styles['combo-empty']}>{t('support:noApartmentsFound')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${styles.field} ${styles.grow}`}>
            <label>
              {t('support:describeIssue')} <span className={styles.req}>*</span>
            </label>
            <div className={styles['ta-wrap']}>
              <textarea
                className={`${fieldStyles.input} ${styles.ta}`}
                maxLength={2000}
                placeholder={t('support:describeIssuePlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <span className={styles['ta-count']}>{text.length} / 2000</span>
            </div>
          </div>

          <div className={styles['sup-attach-row']}>
            <button
              type="button"
              className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}
              onClick={handleAttach}
            >
              <Icon name="clip" /> {t('support:attachFiles')}
            </button>
            <span className={styles.hint}>{t('support:attachHint')}</span>
          </div>
        </div>
      </div>

      <div className={styles['sup-foot']}>
        <Link to="/support" className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']}`}>
          {t('common:close')}
        </Link>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting && <span className={styles.spin} />}
          <Icon name="plus" /> {t('support:submit')}
        </Button>
      </div>
    </>
  )
}
