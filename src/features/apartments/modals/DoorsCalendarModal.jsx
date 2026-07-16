import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { doorCount, monthTotal, yearTotal } from '../../../utils/doorCount'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import Field, { Input } from '../../../components/ui/Field'
import { Seg } from '../../../components/ui/Badge'
import modalStyles from '../../../context/Modal.module.css'
import styles from './Doors.module.css'

const YEARS = [2024, 2025, 2026]
const EXPORT_MS = 1300

function rangeTotal(aptId, from, to) {
  if (!from || !to) return 0
  const f = new Date(from)
  const t = new Date(to)
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return 0
  let total = 0
  for (const dt = new Date(f); dt <= t; dt.setDate(dt.getDate() + 1)) {
    total += doorCount(aptId, dt.getFullYear(), dt.getMonth(), dt.getDate())
  }
  return total
}

// Ported from openDoorsModal()/doorsHtml() at reference/orbi-portal-redesign.html
// lines 1629-1674 — month/year/years views over the mock door-openings data.
// Read-only — no mutation, so `onDone` is accepted for interface parity but
// never called.
export default function DoorsCalendarModal({ apartment }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()
  const busyRef = useRef(false)

  const [mode, setMode] = useState('month') // 'years' | 'year' | 'month'
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5) // June — mirrors the reference's fixed default
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const months = t('apartments:doorsMonths', { returnObjects: true })
  const dow = t('apartments:doorsDow', { returnObjects: true })

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function handleExport() {
    if (busyRef.current) return
    busyRef.current = true
    setExporting(true)
    setTimeout(() => {
      busyRef.current = false
      setExporting(false)
      toast(t('apartments:doorsExportedToast'))
    }, EXPORT_MS)
  }

  let body
  if (mode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
    const cells = []
    for (let i = 0; i < firstDow; i++) {
      cells.push(<div key={`e${i}`} className={`${styles.day} ${styles.empty}`} />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const c = doorCount(apartment.id, year, month, d)
      cells.push(
        <div key={d} className={`${styles.day} ${c > 0 ? styles.hi : ''}`}>
          <span className={styles.dnum}>{d}</span>
          <span className={`${styles.cnt} ${c === 0 ? styles.zero : ''}`}>{c}</span>
        </div>
      )
    }
    const total = monthTotal(apartment.id, year, month)
    const range = rangeTotal(apartment.id, from, to)
    body = (
      <>
        <div className={styles.grid}>
          {dow.map((d) => (
            <div key={d} className={styles.dow}>{d}</div>
          ))}
          {cells}
        </div>
        <div className={styles.summary}>
          <span>{t('apartments:totalThisMonth', { count: total })}</span>
          {from && to && <span>{t('apartments:selectedRange', { count: range })}</span>}
        </div>
      </>
    )
  } else if (mode === 'year') {
    body = (
      <>
        <div className={`${styles.grid} ${styles.months}`}>
          {months.map((name, m) => (
            <button
              type="button"
              key={name}
              className={`${styles.day} ${styles.month}`}
              onClick={() => {
                setMonth(m)
                setMode('month')
              }}
            >
              <span className={styles.dnum}>{name.slice(0, 3)}</span>
              <span className={`${styles.cnt} ${monthTotal(apartment.id, year, m) === 0 ? styles.zero : ''}`}>
                {monthTotal(apartment.id, year, m)}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.summary}>
          <span>{t('apartments:totalYear', { year, count: yearTotal(apartment.id, year) })}</span>
        </div>
      </>
    )
  } else {
    body = (
      <div>
        {YEARS.map((y) => (
          <div
            key={y}
            role="button"
            tabIndex={0}
            className={styles.yearRow}
            onClick={() => {
              setYear(y)
              setMode('year')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setYear(y)
                setMode('year')
              }
            }}
          >
            <span style={{ fontWeight: 600 }}>{y}</span>
            <b>{t('apartments:yearOpenings', { count: yearTotal(apartment.id, y) })}</b>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('apartments:doorsModalTitle', { code: apartment.code })}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <div className={styles.toolbar}>
          <Seg
            options={[
              { value: 'years', label: t('apartments:tabYears') },
              { value: 'year', label: t('apartments:tabYear') },
              { value: 'month', label: t('apartments:tabMonth') },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'month' && (
            <div className={styles.nav}>
              <button type="button" aria-label={t('apartments:prevMonthAria')} onClick={prevMonth}>
                <Icon name="back" />
              </button>
              <span className={styles.mlabel}>{months[month]} {year}</span>
              <button type="button" aria-label={t('apartments:nextMonthAria')} onClick={nextMonth}>
                <Icon name="arrow" />
              </button>
            </div>
          )}
        </div>
        <div className={styles.dateRow}>
          <Field label={t('common:from')} htmlFor="dFrom">
            <Input id="dFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('common:to')} htmlFor="dTo">
            <Input id="dTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {body}
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>{t('common:close')}</Button>
        <Button disabled={exporting} onClick={handleExport}>
          <Icon name="dl" /> {exporting ? t('apartments:doorsExporting') : t('common:download')}
        </Button>
      </div>
    </>
  )
}
