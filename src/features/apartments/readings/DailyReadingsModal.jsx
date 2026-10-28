import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../../context/ModalContext'
import { useToast } from '../../../context/ToastContext'
import { useAsync } from '../../../hooks/useAsync'
import { getDailyReadings } from '../../../api/endpoints/readings'
import Icon from '../../../components/ui/Icon'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'
import modalStyles from '../../../context/Modal.module.css'
import {
  VISIBLE_DAYS,
  axisLabel,
  dayLabel,
  fmtReading,
  groupByMonth,
  monthFull,
  monthShort,
  readingsCsv,
  splitDay,
  visibleWindow,
  yMaxFor,
} from './readingsData'
import styles from './Readings.module.css'

// Electricity "Daily readings": a year of daily meter readings. The chart
// shows 30 days across its full width and scrolls sideways through the rest
// of the year (trackpad, touch, or dragging with the mouse); the month under
// the middle of the chart is the current one - named in the title badge, its
// bars at full strength, the others stepped back. Below, the whole year as a
// list, newest first, with a sticky header per month. A bar and its row
// point at each other.
export default function DailyReadingsModal({ apartment }) {
  const { t } = useTranslation()
  const { closeModal } = useModal()
  const toast = useToast()
  const counter = apartment.services?.electricity?.counter ?? '-'
  const flatId = apartment.objectId ?? apartment.id
  const { data, loading, error, reload } = useAsync(() => getDailyReadings(flatId), [flatId])

  function exportCsv() {
    if (!data?.length) return
    const blob = new Blob([readingsCsv(data)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `electricity-readings-${counter}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast(t('apartments:readingsExported'))
  }

  return (
    <>
      <div className={styles.head}>
        <span className={styles.tile}>
          <Icon name="bolt" />
        </span>
        <div className={styles.ttl}>
          <h3>{t('apartments:dailyReadings')}</h3>
          <span>{t('apartments:readingsSub', { counter })}</span>
        </div>
        <button
          type="button"
          className={modalStyles['modal-x']}
          aria-label={t('apartments:readingsExport')}
          onClick={exportCsv}
          disabled={!data?.length}
        >
          <Icon name="dl" />
        </button>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      {loading && (
        <div className={styles.state}>
          <Skeleton h={170} />
          <Skeleton h={14} style={{ marginTop: 18 }} />
          <Skeleton h={14} w="70%" style={{ marginTop: 10 }} />
        </div>
      )}
      {!loading && error && (
        <div className={styles.state} style={{ textAlign: 'center' }}>
          <p className={styles.muted}>{t('common:requestFailed')}</p>
          <Button variant="ghost" onClick={reload}>
            <Icon name="reload" /> {t('common:retry')}
          </Button>
        </div>
      )}
      {!loading && !error && !data?.length && (
        <div className={styles.state} style={{ textAlign: 'center' }}>
          <p className={styles.muted}>{t('apartments:readingsEmpty')}</p>
        </div>
      )}
      {!loading && !error && data?.length > 0 && <ReadingsView days={data} />}
    </>
  )
}

function ReadingsView({ days }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2)
  const last = days.length - 1
  const months = useMemo(() => groupByMonth(days), [days])
  const yMax = useMemo(() => yMaxFor(days), [days])
  const ticks = useMemo(() => {
    const out = []
    for (let v = yMax; v >= 0; v -= 5) out.push(v)
    return out
  }, [yMax])

  const scRef = useRef(null)
  const chartRef = useRef(null)
  const listRef = useRef(null)
  const pendingRef = useRef('end') // where to scroll once the slot width is known
  const [slot, setSlot] = useState(0)
  const [view, setView] = useState({ first: Math.max(0, last - VISIBLE_DAYS + 1), last, mid: last })
  const [sel, setSel] = useState(null)
  const [tip, setTip] = useState(null) // { i, x, y }
  const [edges, setEdges] = useState({ l: false, r: false })

  const readView = useCallback(() => {
    const sc = scRef.current
    if (!sc) return
    const next = visibleWindow(sc.scrollLeft, sc.clientWidth, sc.clientWidth / VISIBLE_DAYS, days.length)
    setView((v) => (v.first === next.first && v.mid === next.mid && v.last === next.last ? v : next))
    setEdges({ l: sc.scrollLeft > 2, r: sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2 })
  }, [days.length])

  // 30 days always fill the chart. Re-fit whenever its own width changes,
  // keeping the newest day in view if it was, the same first day otherwise.
  useEffect(() => {
    const sc = scRef.current
    if (!sc) return undefined
    const fit = () => {
      const w = sc.clientWidth
      if (!w) return
      setSlot((prev) => {
        const next = w / VISIBLE_DAYS
        if (prev && Math.abs(prev - next) < 0.01) return prev
        if (prev && pendingRef.current == null) {
          const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 2
          pendingRef.current = atEnd ? 'end' : Math.round(sc.scrollLeft / prev)
        }
        return next
      })
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(fit)
    ro.observe(sc)
    return () => ro.disconnect()
  }, [])

  // Apply the pending scroll once the track has its new width.
  useLayoutEffect(() => {
    const sc = scRef.current
    if (!sc || !slot || pendingRef.current == null) return
    const target = pendingRef.current
    pendingRef.current = null
    sc.scrollLeft = target === 'end' ? sc.scrollWidth : target * slot
    readView()
  }, [slot, readView])

  // Scroll: re-read the window once per frame; any open tooltip goes.
  const rafRef = useRef(0)
  function onScroll() {
    setTip(null)
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      readView()
    })
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Mouse users drag the chart; a press that barely moves is still a click.
  const dragRef = useRef(null) // { x, left, moved }
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    function move(e) {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.x
      if (!d.moved && Math.abs(dx) > 4) {
        d.moved = true
        setDragging(true)
      }
      if (d.moved) scRef.current.scrollLeft = d.left - dx
    }
    function up() {
      if (!dragRef.current) return
      dragRef.current = null
      // Cleared after the click that ends a drag, so that click is ignored.
      setTimeout(() => setDragging(false), 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse') return
    dragRef.current = { x: e.clientX, left: scRef.current.scrollLeft, moved: false }
  }

  // The tooltip sits outside the scroller, so the tallest bar never clips it.
  function showTip(i, el) {
    const chart = chartRef.current
    if (!chart || !el) return
    const br = el.getBoundingClientRect()
    const cr = chart.getBoundingClientRect()
    setTip({ i, x: br.left + br.width / 2 - cr.left, y: br.top - cr.top, w: cr.width })
  }

  function flashRow(i, scroll) {
    const list = listRef.current
    const row = list?.querySelector(`[data-row="${i}"]`)
    if (!row) return
    if (scroll) list.scrollTo({ top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2, behavior: 'smooth' })
    row.classList.remove(styles.flash)
    void row.offsetWidth
    row.classList.add(styles.flash)
  }
  function onBarClick(e, i) {
    if (dragging) return
    setSel(i)
    showTip(i, e.currentTarget.firstChild)
    flashRow(i, true)
  }
  function onRowClick(i) {
    setSel(i)
    setTip(null)
    flashRow(i, false)
    const sc = scRef.current
    if (sc && slot) sc.scrollTo({ left: (i + 0.5) * slot - sc.clientWidth / 2, behavior: 'smooth' })
  }

  const midMonth = months.find((g) => view.mid >= g.start && view.mid <= g.end) || months[months.length - 1]
  const a = splitDay(days[view.first].date)
  const b = splitDay(days[view.last].date)
  const range = `${a.d} ${monthShort(a.m, lang)}${a.y !== b.y ? ` ${a.y}` : ''} - ${b.d} ${monthShort(b.m, lang)} ${b.y}`
  const halfGap = slot ? Math.min(3, slot * 0.14) : 2
  const trackW = slot * days.length

  return (
    <>
      <div className={styles.chartsec} ref={chartRef}>
        <div className={styles['chart-title']}>
          <b>{t('apartments:dailyConsumption')}</b>
          <span className={styles.mnow} data-testid="readings-month">
            {monthFull(midMonth.m, lang)} {midMonth.y}
          </span>
          <span className={styles.range} data-testid="readings-range">{range}</span>
        </div>
        <div className={styles['plot-wrap']}>
          <div className={styles.yaxis}>
            <div className={styles.yunit}>{t('apartments:kwhPerDay')}</div>
            <div className={styles.yticks}>
              {ticks.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
          <div className={`${styles.plot} ${edges.l ? styles['more-l'] : ''} ${edges.r ? styles['more-r'] : ''}`}>
            <div className={styles.grid}>
              {ticks.map((v) => (
                <i key={v} />
              ))}
            </div>
            <div
              ref={scRef}
              className={`${styles.pscroll} ${dragging ? styles.drag : ''}`}
              onScroll={onScroll}
              onPointerDown={onPointerDown}
            >
              <div className={styles.ptrack} style={{ width: trackW, '--slot': `${slot}px`, '--half-gap': `${halfGap}px` }}>
                {months.slice(1).map((g) => (
                  <i key={g.key} className={styles.msep} style={{ left: g.start * slot }} />
                ))}
                <div className={styles.bars} style={{ width: trackW }}>
                  {days.map((d, i) => (
                    <div
                      key={d.date}
                      className={`${styles.day} ${i < midMonth.start || i > midMonth.end ? styles.out : ''}`}
                      data-i={i}
                      onClick={(e) => onBarClick(e, i)}
                      onMouseEnter={(e) => {
                        if (!dragging && window.matchMedia?.('(hover: hover)').matches) showTip(i, e.currentTarget.firstChild)
                      }}
                      onMouseLeave={() => setTip(null)}
                    >
                      <div
                        className={`${styles.bar} ${i === last ? styles.today : ''} ${sel === i ? styles.sel : ''}`}
                        style={{ height: `${Math.round((d.use / yMax) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.xlabels} style={{ width: trackW }}>
                  {days.map((d, i) => {
                    const l = axisLabel(d.date, i === last, slot, lang)
                    return (
                      <span key={d.date} className={l.month ? styles.m1 : i === last ? styles.todayLbl : ''}>
                        {l.text}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        {tip && (
          <div
            className={styles.ctip}
            role="status"
            style={{ left: Math.max(70, Math.min(tip.w - 70, tip.x)), top: tip.y - 8 }}
          >
            {dayLabel(days[tip.i].date, lang)} · {fmtReading(days[tip.i].use)} {t('apartments:kwh')}
          </div>
        )}
      </div>

      <div className={styles.listhead}>
        <span>{t('apartments:readingsDate')}</span>
        <span>{t('apartments:readingsMeter')}</span>
        <span className={styles.r}>{t('apartments:readingsUse')}</span>
      </div>
      <div className={styles.listbody} ref={listRef}>
        {months
          .slice()
          .reverse()
          .map((g) => (
            <div key={g.key}>
              <div className={styles.lmonth}>
                {monthFull(g.m, lang)} {g.y}
                <span>
                  {fmtReading(g.total)} {t('apartments:kwh')}
                </span>
              </div>
              {days
                .slice(g.start, g.end + 1)
                .map((d, j) => ({ d, i: g.start + j }))
                .reverse()
                .map(({ d, i }) => (
                  <button type="button" key={d.date} className={styles.lrow} data-row={i} onClick={() => onRowClick(i)}>
                    <span className={styles.d}>{dayLabel(d.date, lang)}</span>
                    <span className={styles.rd}>
                      <small>{t('apartments:readingsMeterShort')} </small>
                      {fmtReading(d.reading)}
                    </span>
                    <span className={`${styles.u} ${styles.r}`}>
                      +{fmtReading(d.use)}
                      <small>{t('apartments:kwh')}</small>
                    </span>
                  </button>
                ))}
            </div>
          ))}
      </div>
    </>
  )
}
