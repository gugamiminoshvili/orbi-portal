import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { USE_MOCK } from '../../../api/client'
import { getLockHistory } from '../../../api/endpoints/locks'
import { doorCount, monthTotal, yearTotal } from '../../../utils/doorCount'
import Button from '../../../components/ui/Button'
import Icon from '../../../components/ui/Icon'
import Field, { Input } from '../../../components/ui/Field'
import { Seg } from '../../../components/ui/Badge'
import Skeleton from '../../../components/ui/Skeleton'
import modalStyles from '../../../context/Modal.module.css'
import styles from './Doors.module.css'

const YEARS = [2024, 2025, 2026]
const EXPORT_MS = 1300

function pad2(n) {
  return String(n).padStart(2, '0')
}

function rangeTotal(from, to, countFn) {
  if (!from || !to) return 0
  const f = new Date(from)
  const t = new Date(to)
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return 0
  let total = 0
  for (const dt = new Date(f); dt <= t; dt.setDate(dt.getDate() + 1)) {
    total += countFn(dt.getFullYear(), dt.getMonth(), dt.getDate())
  }
  return total
}

// Real-mode data source: one GET /mobileApi/lockHistory/ call per displayed
// year (covering Jan 1 – Dec 31), cached per year so switching between
// month/year/years views — or navigating months within an already-loaded
// year — never re-fetches. `yearHistory[y]` is `undefined` (not yet
// requested), `'loading'`, or the adaptLockHistory() `{byDay,total}` result.
function useRealDoorHistory(apartmentId, mode, year) {
  const [yearHistory, setYearHistory] = useState({})

  useEffect(() => {
    if (USE_MOCK) return undefined
    const needed = mode === 'years' ? YEARS : [year]
    const toFetch = needed.filter((y) => !yearHistory[y])
    if (toFetch.length === 0) return undefined

    setYearHistory((prev) => {
      const next = { ...prev }
      for (const y of toFetch) next[y] = 'loading'
      return next
    })

    let cancelled = false
    Promise.all(
      toFetch.map((y) =>
        getLockHistory(apartmentId, `${y}-01-01 00:00:00`, `${y}-12-31 23:59:59`).then((data) => ({ y, data }))
      )
    ).then((results) => {
      if (cancelled) return
      setYearHistory((prev) => {
        const next = { ...prev }
        for (const { y, data } of results) next[y] = data
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, year, apartmentId, yearHistory])

  function isLoading(y) {
    return !USE_MOCK && yearHistory[y] === 'loading'
  }
  function dayCount(y, m, d) {
    const entry = yearHistory[y]
    if (!entry || entry === 'loading') return 0
    return entry.byDay[`${y}-${pad2(m + 1)}-${pad2(d)}`] || 0
  }
  function monthCount(y, m) {
    const days = new Date(y, m + 1, 0).getDate()
    let t = 0
    for (let d = 1; d <= days; d++) t += dayCount(y, m, d)
    return t
  }
  function yearCount(y) {
    const entry = yearHistory[y]
    return entry && entry !== 'loading' ? entry.total : 0
  }

  return { isLoading, dayCount, monthCount, yearCount }
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

  // /mobileApi/lockHistory/'s `apartmentId` is the flat/room id (matches
  // /flat/{flat_id}/'s id, i.e. `objectId` on the merged real-mode apartment
  // shape — see adapters/apartments.js) — falls back to `.id` for the mock
  // shape, which the hook never actually calls out to under USE_MOCK anyway.
  const real = useRealDoorHistory(apartment.objectId ?? apartment.id, mode, year)
  const dCount = (y, m, d) => (USE_MOCK ? doorCount(apartment.id, y, m, d) : real.dayCount(y, m, d))
  const mTotal = (y, m) => (USE_MOCK ? monthTotal(apartment.id, y, m) : real.monthCount(y, m))
  const yTotal = (y) => (USE_MOCK ? yearTotal(apartment.id, y) : real.yearCount(y))
  const yearLoading = (y) => !USE_MOCK && real.isLoading(y)

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
  if (mode === 'month' && yearLoading(year)) {
    body = <MonthSkeleton dow={dow} />
  } else if (mode === 'month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
    const cells = []
    const rows = []
    for (let i = 0; i < firstDow; i++) {
      cells.push(<div key={`e${i}`} className={`${styles.day} ${styles.empty}`} />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const c = dCount(year, month, d)
      cells.push(
        <div key={d} className={`${styles.day} ${c > 0 ? styles.hi : ''}`}>
          <span className={styles.dnum}>{d}</span>
          <span className={`${styles.cnt} ${c === 0 ? styles.zero : ''}`}>{c}</span>
        </div>
      )
      rows.push(
        <div key={d} className={styles.row}>
          <span>{d} {months[month].slice(0, 3)} {year}</span>
          <b>{t('apartments:dayOpenings', { count: c })}</b>
        </div>
      )
    }
    const total = mTotal(year, month)
    const range = rangeTotal(from, to, dCount)
    body = (
      <>
        <div className={styles.grid}>
          {dow.map((d) => (
            <div key={d} className={styles.dow}>{d}</div>
          ))}
          {cells}
        </div>
        <div className={styles.list}>{rows}</div>
        <div className={styles.summary}>
          <span>{t('apartments:totalThisMonth', { count: total })}</span>
          {from && to && <span>{t('apartments:selectedRange', { count: range })}</span>}
        </div>
      </>
    )
  } else if (mode === 'year' && yearLoading(year)) {
    body = <YearGridSkeleton />
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
              <span className={`${styles.cnt} ${mTotal(year, m) === 0 ? styles.zero : ''}`}>
                {mTotal(year, m)}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.summary}>
          <span>{t('apartments:totalYear', { year, count: yTotal(year) })}</span>
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
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setYear(y)
                setMode('year')
              }
            }}
          >
            <span style={{ fontWeight: 600 }}>{y}</span>
            {yearLoading(y) ? (
              <Skeleton w={48} h={16} r={6} />
            ) : (
              <b>{t('apartments:yearOpenings', { count: yTotal(y) })}</b>
            )}
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

// Real-mode loading placeholder for the month/year grids while the year's
// GET /mobileApi/lockHistory/ call is in flight — shown instead of doorCount/
// monthTotal/yearTotal's synchronous mock values, which real mode has none
// of until the fetch resolves.
function MonthSkeleton({ dow, grid = 31 }) {
  return (
    <div className={styles.grid}>
      {dow.map((d) => (
        <div key={d} className={styles.dow}>{d}</div>
      ))}
      {Array.from({ length: grid }, (_, i) => (
        <Skeleton key={i} h={44} r={8} />
      ))}
    </div>
  )
}

function YearGridSkeleton() {
  return (
    <div className={`${styles.grid} ${styles.months}`}>
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} h={60} r={8} />
      ))}
    </div>
  )
}
