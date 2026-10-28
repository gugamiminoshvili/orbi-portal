import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { fmt, fmtNum } from '../../utils/format'
import { hasApCode, owedFor, round2, serviceTypeFor } from './payFlowData'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import cbStyles from '../../components/ui/Checkbox.module.css'
import Checkbox from '../../components/ui/Checkbox'
import Icon from '../../components/ui/Icon'
import { Seg } from '../../components/ui/Badge'
import MethodModal from './MethodModal'
import { UTILITY_ICON } from './utilityIcons'
import styles from './PayFlow.module.css'

const ROLE_OPTIONS = ['All', 'Owner']

// Upper bound on a single row's amount. Not a business rule — the outstanding
// amount no longer caps the field (see below) — just a guard against a
// runaway typo becoming a real payment request.
const MAX_ROW_AMOUNT = 999999.99

// One row's payable amount: a caption inside the box, the figure under it.
// While the field has focus it shows exactly what was typed; the moment it
// loses focus the value is re-rendered grouped ("1,234.56"), which is why it
// is a text input rather than type="number" — a number input refuses to
// display the separators, and its spinners have no place in a payment table.
//
// The amount used to be capped at the row's outstanding balance. It isn't any
// more: paying more than is owed — including on an apartment that owes nothing
// at all — is deliberate, it credits the account as an advance (owner ruling
// 2026-08-06). FLAG: /payment/multi/'s own handling of an overpayment is still
// unconfirmed by the backend (design doc backend-Q #1).
function AmountField({ label, value, max, disabled, onChange, ariaLabel }) {
  const [draft, setDraft] = useState(null) // non-null only while being edited

  // A field disabled mid-edit (its row unchecked while it still had focus)
  // never receives the blur that would clear the draft, and would go on
  // showing the raw "40" instead of "40.00" — here and again when the row is
  // re-checked. Dropping the draft on disable covers both; the next focus
  // rebuilds it.
  useEffect(() => {
    if (disabled) setDraft(null)
  }, [disabled])

  function handleChange(raw) {
    const n = parseFloat(raw.replace(/[^\d.]/g, ''))
    const clamped = Number.isNaN(n) ? 0 : Math.min(max, Math.max(0, n))
    // Normally the field shows exactly what was typed. The exception is when
    // the cap bites: then it snaps to the capped figure straight away, so the
    // limit is visible as it happens rather than on blur.
    setDraft(!Number.isNaN(n) && clamped !== n ? String(clamped) : raw)
    onChange(clamped)
  }

  return (
    <span className={`${styles.amt} ${disabled ? styles.off : ''}`}>
      <span className={styles['amt-lab']}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        className={styles['amt-input']}
        disabled={disabled}
        value={draft ?? fmtNum(Number(value) || 0)}
        aria-label={ariaLabel}
        onFocus={() => setDraft(String(Number(value) || 0))}
        onBlur={() => setDraft(null)}
        onChange={(e) => handleChange(e.target.value)}
      />
    </span>
  )
}

// Step 3: the apartment checkbox table for the selected complex+utility,
// plus the summary/Pay-Now panel. `selections` is the lifted `{code:
// amount}` state MultiPayFlow owns (so it survives a Back-and-forward round
// trip and is what the eventual POST /payment/multi/ body — P3-4 — will be
// built from). Keyed by the apartment `code`, not its `epcode`: the code is
// always present and unique, while apartments without an AP code all share
// the same empty epcode and would collide in one key.
export default function ApartmentsStep({
  complex,
  utility,
  usdRate,
  maintenanceCurrency,
  selections,
  onSelectionsChange,
}) {
  const { t } = useTranslation()
  const { openModal } = useModal()
  const [roleFilter, setRoleFilter] = useState('All')
  // What each row's field DISPLAYS, kept separately from `selections` (what
  // will actually be paid) so unchecking a row leaves its amount on screen,
  // greyed out, instead of wiping it — re-checking a row you toggled off by
  // mistake shouldn't cost the number you typed. Only `selections` feeds the
  // footer total and the POST body.
  const [amounts, setAmounts] = useState({})

  // Per-row owed amount (see payFlowData's owedFor doc comment for the sign
  // convention: positive = debt, negative = already in advance, 0 = settled).
  // EVERY row is payable, including the last two: an apartment with nothing
  // outstanding can still be paid into as an advance (owner ruling
  // 2026-08-06). The sign only drives the colour and the default amount now.
  const rows = useMemo(
    () =>
      complex.apartments
        .filter((row) => roleFilter === 'All' || row.role === roleFilter)
        .map((row) => ({ ...row, owed: owedFor(row, utility, usdRate, maintenanceCurrency) })),
    [complex.apartments, utility, usdRate, maintenanceCurrency, roleFilter]
  )

  // Rows without an AP code can't be chosen, so they don't count toward the
  // "n of m" either - "1 of 6" where two can never be ticked reads as a bug.
  const payableRows = rows.filter(hasApCode)
  const selectedCount = payableRows.filter((r) => selections[r.code] != null).length
  const total = Object.values(selections).reduce((sum, v) => sum + (Number(v) || 0), 0)

  // Carried fix (P3-5 review, filter-vs-selections desync): switching
  // roleFilter re-derives `rows` above, but `selections`/`total` are keyed
  // by epcode across the WHOLE complex, not just the currently-visible
  // rows — so a row checked under "All" stayed in `selections` (and kept
  // contributing to `total`) even after the filter hid it, while
  // `selectedCount` (computed FROM the filtered `rows`) silently dropped
  // it. That made the footer's "n of m selected · Total X" line
  // self-contradictory. Fix: when the filter itself changes, drop any
  // selection whose row is no longer visible under the new filter, so
  // selections/selectedCount/total always describe what's on screen.
  function handleRoleFilterChange(nextFilter) {
    setRoleFilter(nextFilter)
    if (nextFilter === 'All') return
    const visibleCodes = new Set(
      complex.apartments.filter((row) => row.role === nextFilter).map((row) => row.code)
    )
    onSelectionsChange((prev) => {
      const next = {}
      for (const [code, amount] of Object.entries(prev)) {
        if (visibleCodes.has(code)) next[code] = amount
      }
      return next
    })
  }

  // Both setState calls stay OUT of the onSelectionsChange updater — React
  // runs that during the owner component's render, and a setAmounts() in
  // there is a cross-component update mid-render.
  function toggleRow(row) {
    if (!hasApCode(row)) return
    if (selections[row.code] != null) {
      onSelectionsChange((prev) => {
        const next = { ...prev }
        delete next[row.code] // the displayed amount deliberately stays
        return next
      })
      return
    }
    // Re-checking restores whatever was last typed here, falling back the
    // first time to the full outstanding amount — or to 0 when there is
    // nothing outstanding, since how much to pay ahead is the user's call.
    const amount = amounts[row.code] ?? Math.max(0, round2(row.owed))
    setAmounts((a) => ({ ...a, [row.code]: amount }))
    onSelectionsChange((prev) => ({ ...prev, [row.code]: amount }))
  }

  // The whole row toggles, not just the checkbox. Clicks that landed on
  // something with its own behaviour (the checkbox, the amount input) are
  // left alone — otherwise focusing the field would uncheck the row.
  function handleRowClick(e, row) {
    if (e.target.closest('input, button, a, label')) return
    toggleRow(row)
  }

  // AmountField has already parsed and clamped to [0, owed] — this just
  // records the number in both maps.
  function updateAmount(row, amount) {
    setAmounts((a) => ({ ...a, [row.code]: amount }))
    onSelectionsChange((prev) => ({ ...prev, [row.code]: amount }))
  }

  // POST /payment/multi/ addresses apartments by AP code, so the selections
  // (keyed by apartment code) are translated back here.
  const epcodeByCode = new Map(complex.apartments.map((row) => [row.code, row.epcode]))

  // Header checkbox: every payable row on screen, on or off. Ticking all
  // restores what was typed in a row before, else its full outstanding amount.
  const allOn = payableRows.length > 0 && selectedCount === payableRows.length
  const someOn = selectedCount > 0 && !allOn
  const headCb = useRef(null)
  useEffect(() => {
    if (headCb.current) headCb.current.indeterminate = someOn
  }, [someOn])
  function toggleAll() {
    if (allOn) {
      const codes = new Set(payableRows.map((r) => r.code))
      onSelectionsChange((prev) => Object.fromEntries(Object.entries(prev).filter(([c]) => !codes.has(c))))
      return
    }
    const nextAmounts = {}
    for (const r of payableRows) {
      if (selections[r.code] == null) nextAmounts[r.code] = amounts[r.code] ?? Math.max(0, round2(r.owed))
    }
    setAmounts((a) => ({ ...a, ...nextAmounts }))
    onSelectionsChange((prev) => ({ ...prev, ...nextAmounts }))
  }

  // The role filter only earns its place when the complex mixes roles.
  const mixedRoles = new Set(complex.apartments.map((r) => r.role)).size > 1
  const showRate = utility === 'maintenance' && maintenanceCurrency === 'USD' && usdRate != null
  const ui = UTILITY_ICON[utility]

  function openPay() {
    openModal(
      <MethodModal
        complexName={complex.project}
        utilityLabel={t(`pay:utilityLabels.${utility}`)}
        amount={total}
        services={Object.entries(selections).map(([code, amt]) => ({
          epcode: epcodeByCode.get(code),
          amount: amt,
          serviceType: serviceTypeFor(utility),
        }))}
      />,
      { size: 'md' }
    )
  }

  return (
    <div className={styles['step3-grid']}>
      <div className={styles['step3-main']}>
        {mixedRoles && (
          <div className={styles['filter-row']}>
            <Seg
              options={ROLE_OPTIONS.map((r) => ({ value: r, label: t(`apartments:roles.${r}`) }))}
              value={roleFilter}
              onChange={handleRoleFilterChange}
              role="tablist"
              aria-label={t('apartments:filterAria')}
            />
          </div>
        )}
        <Card className={styles.tcard}>
          <div className={styles['tbl-wrap']}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th className={styles.cbcol}>
                    <input
                      ref={headCb}
                      type="checkbox"
                      className={cbStyles.cb}
                      checked={allOn}
                      disabled={payableRows.length === 0}
                      onChange={toggleAll}
                      aria-label={t('pay:selectAll')}
                    />
                  </th>
                  <th>{t('pay:tableApartmentHeader')}</th>
                  <th className={styles.r}>{t('pay:tableOutstandingHeader')}</th>
                  <th className={styles.r}>{t('pay:tablePayAmountHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const checked = selections[row.code] != null
                  const owedClass =
                    row.owed > 0 ? styles['owed-neg'] : row.owed < 0 ? styles['owed-pos'] : styles['owed-zero']
                  // No AP code: listed with its debt, but it can't be paid -
                  // a disabled checkbox, an amber band, a tag saying why and
                  // the way to get it fixed. The amount box is an empty dashed
                  // outline so the row reads "not payable", not "0".
                  if (!hasApCode(row)) {
                    return (
                      <tr key={row.code} className={styles.noap} aria-disabled="true">
                        <td>
                          <Checkbox aria-label={row.code} checked={false} disabled readOnly />
                        </td>
                        <td>
                          <span className={styles['apt-code']}>{row.code}</span>
                          <span className={styles['noap-tag']}>
                            <Icon name="warn" size={13} /> {t('pay:noApCodeTag')}
                          </span>
                          <span className={styles['noap-why']}>
                            {t('pay:noApCodeWhy')}{' '}
                            <Link to="/support/new">{t('pay:noApCodeLink')}</Link>
                          </span>
                        </td>
                        <td className={`${styles.r} ${owedClass}`}>{fmt(row.owed, '₾')}</td>
                        <td className={styles.r}>
                          <span className={`${styles.amt} ${styles.na}`}>
                            <span className={styles['amt-lab']}>{t('pay:tableAmountHeader')}</span>
                            <input
                              type="text"
                              className={styles['amt-input']}
                              value="-"
                              disabled
                              readOnly
                              aria-label={`${t('pay:tableAmountHeader')} ${row.code}`}
                            />
                          </span>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr
                      key={row.code}
                      className={checked ? styles.on : ''}
                      onClick={(e) => handleRowClick(e, row)}
                    >
                      <td>
                        <Checkbox
                          aria-label={row.code}
                          checked={checked}
                          onChange={() => toggleRow(row)}
                        />
                      </td>
                      <td>{row.code}</td>
                      <td className={`${styles.r} ${owedClass}`}>{fmt(row.owed, '₾')}</td>
                      <td className={styles.r}>
                        <AmountField
                          label={t('pay:tableAmountHeader')}
                          value={checked ? selections[row.code] : (amounts[row.code] ?? 0)}
                          max={MAX_ROW_AMOUNT}
                          disabled={!checked}
                          onChange={(raw) => updateAmount(row, raw)}
                          ariaLabel={`${t('pay:tableAmountHeader')} ${row.code}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className={styles['tbl-foot']}>
            <span>{t('pay:selectedOfApartments', { n: selectedCount, m: payableRows.length })}</span>
            <span className={styles['foot-total']}>
              {t('pay:totalShort')} <b>{fmt(total, '₾')}</b>
            </span>
          </div>
          {/* Says out loud what the table allows, so a zero-balance row
              doesn't read as a checkbox that does nothing. */}
          <p className={styles['foot-note']}>{t('pay:advanceNote')}</p>
        </Card>
      </div>

      <Card className={styles.summary}>
        <h3>{t('pay:summaryTitle')}</h3>
        <div className={styles['summary-row']}>
          <span className={styles.k}>{t('pay:summaryComplex')}</span>
          <span className={styles.v}>{complex.project}</span>
        </div>
        <div className={styles['summary-row']}>
          <span className={styles.k}>{t('pay:summaryUtility')}</span>
          <span className={styles.v}>
            <span className={styles['v-ic']} style={{ color: ui?.color }}>
              <Icon name={ui?.icon || 'doc'} size={14} />
            </span>
            {t(`pay:utilityLabels.${utility}`)}
          </span>
        </div>
        <div className={styles['summary-row']}>
          <span className={styles.k}>{t('pay:summarySelected')}</span>
          <span className={styles.v}>{t('pay:summarySelectedOf', { n: selectedCount, m: payableRows.length })}</span>
        </div>
        {/* Only when a USD->GEL conversion actually happened (live maintenance). */}
        {showRate && (
          <div className={styles['summary-row']}>
            <span className={styles.k}>
              <Icon name="info" size={13} /> {t('pay:currencyRate')}
            </span>
            <span className={styles.v}>{t('pay:rateLine', { rate: usdRate.toFixed(2) })}</span>
          </div>
        )}
        <div className={styles['summary-total']}>
          <span className={styles.k}>{t('pay:payableAmount')}</span>
          <span className={styles.v}>
            {fmtNum(total)} <small>₾</small>
          </span>
        </div>
        <Button className={styles.paybtn} disabled={total <= 0} onClick={openPay}>
          {t('pay:payNow')}
        </Button>
      </Card>

      {/* Phone: the summary folds into a bar that stays at the bottom. */}
      <div className={styles.paybar}>
        <div>
          <b>{fmt(total, '₾')}</b>
          {showRate && <span className={styles.ratepill}>{t('pay:rateLine', { rate: usdRate.toFixed(2) })}</span>}
        </div>
        <Button disabled={total <= 0} onClick={openPay}>
          {t('pay:payNow')}
        </Button>
      </div>
    </div>
  )
}
