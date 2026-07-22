import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { useModal } from '../../context/ModalContext'
import { useAsync } from '../../hooks/useAsync'
import { createTicket } from '../../api/endpoints/support'
import { listApartments } from '../../api/endpoints/apartments'
import { SUPPORT_TOPICS, topicById } from '../../api/mock/tickets'
import { blockGrad } from '../../api/mock/apartments'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import { SearchField } from '../../components/ui/Field'
import buttonStyles from '../../components/ui/Button.module.css'
import fieldStyles from '../../components/ui/Field.module.css'
import modalStyles from '../../context/Modal.module.css'
import styles from './Support.module.css'

// The topic picker lives in a modal (opened from the collapsed "Select topic"
// row) rather than an always-visible grid; picking a card closes it.
function TopicModal({ current, onPick }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  return (
    <>
      <div className={modalStyles['modal-head']}>
        <div>
          <h3>{t('support:newTicket')}</h3>
          <div className={styles['dh-sub']}>{t('support:newTicketSub')}</div>
        </div>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <div className={styles['topic-grid']}>
          {SUPPORT_TOPICS.map((tp) => (
            <button
              key={tp.id}
              type="button"
              className={`${styles['topic-card']} ${current === tp.id ? styles.sel : ''}`}
              onClick={() => {
                onPick(tp.id)
                closeModal()
              }}
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
    </>
  )
}

// New-ticket form for /support/new. No back-header (owner request): the topic
// selection sits at the top as a collapsed row that opens the picker modal,
// and the apartment field is a multi-select (submitted as roomsId[]).
export default function NewTicketPane() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { openModal } = useModal()
  const { bumpTicketsRefresh } = useOutletContext()

  const { data: apartments } = useAsync(() => listApartments(), [])
  const apts = apartments || []

  const [topic, setTopic] = useState(null)
  const [aptIds, setAptIds] = useState([])
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

  const selectedTopic = topic ? topicById(topic) : null
  const canSubmit = !!topic && text.trim().length > 0
  const selectedApts = apts.filter((a) => aptIds.includes(a.id))
  const q = aptQuery.trim().toLowerCase()
  const filteredApts = q ? apts.filter((a) => a.code.toLowerCase().includes(q)) : apts

  function openTopicModal() {
    openModal(<TopicModal current={topic} onPick={setTopic} />, { size: 'lg' })
  }

  function toggleApt(id) {
    setAptIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const ticket = await createTicket({ topic, apts: selectedApts, text: text.trim() })
    setSubmitting(false)
    bumpTicketsRefresh()
    toast(t('support:createdToast', { id: ticket.id }))
    navigate(`/support/t/${ticket.id}`)
  }

  function handleAttach() {
    toast(t('support:attachToast'))
  }

  return (
    <>
      <div className={styles['sup-create-body']}>
        <div className={styles['sup-form']}>
          <div className={styles.field}>
            <label>
              {t('support:topic')} <span className={styles.req}>*</span>
            </label>
            <button type="button" className={styles['topic-select']} onClick={openTopicModal}>
              {selectedTopic ? (
                <>
                  <span
                    className={styles['ts-ic']}
                    style={{ background: selectedTopic.tintBg, color: selectedTopic.tintCol }}
                  >
                    <Icon name={selectedTopic.icon} />
                  </span>
                  <span className={styles['ts-label']}>{t(`support:topics.${selectedTopic.id}.label`)}</span>
                  <span className={styles['ts-action']}>{t('support:changeTopic')}</span>
                </>
              ) : (
                <>
                  <span className={`${styles['ts-ic']} ${styles.empty}`}>
                    <Icon name="empty" />
                  </span>
                  <span className={styles['ts-label']}>{t('support:selectTopic')}</span>
                  <span className={styles['ts-action']}>{t('support:selectAction')}</span>
                </>
              )}
            </button>
          </div>

          <div className={styles.field}>
            <label>
              {t('support:apartments')} <span className={styles.optional}>{t('support:optional')}</span>
            </label>
            <div ref={comboRef} className={`${styles.combo} ${aptOpen ? styles.open : ''}`}>
              <button
                type="button"
                className={styles['combo-btn']}
                onClick={() => {
                  setAptOpen((o) => !o)
                  setAptQuery('')
                }}
              >
                {selectedApts.length === 0 ? (
                  <span>{t('support:generalOption')}</span>
                ) : (
                  <b>{t('support:apartmentsSelected', { count: selectedApts.length })}</b>
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
                    {filteredApts.map((a) => {
                      const on = aptIds.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`${styles['combo-opt']} ${on ? styles.sel : ''}`}
                          onClick={() => toggleApt(a.id)}
                        >
                          <span className={styles['co-ic']} style={{ background: blockGrad(a) }}>
                            <Icon name="building" />
                          </span>
                          <div className={styles['co-t']}>{a.code}</div>
                          <span className={`${styles['opt-check']} ${on ? styles.on : ''}`}>
                            {on && <Icon name="check" />}
                          </span>
                        </button>
                      )
                    })}
                    {filteredApts.length === 0 && (
                      <div className={styles['combo-empty']}>{t('support:noApartmentsFound')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {selectedApts.length > 0 && (
              <div className={styles['apt-chips']}>
                {selectedApts.map((a) => (
                  <span key={a.id} className={styles['apt-chip']}>
                    <Icon name="building" />
                    {a.code}
                    <button
                      type="button"
                      aria-label={t('common:remove', 'Remove')}
                      onClick={() => toggleApt(a.id)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
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
