import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { fmt, fmtNum } from '../../utils/format'
import { owedFor, round2, serviceTypeFor } from './payFlowData'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import Icon from '../../components/ui/Icon'
import { Seg } from '../../components/ui/Badge'
import MethodModal from './MethodModal'
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
// plus the summary/Pay-Now panel. `selections` is the lifted `{epcode:
// amount}` state MultiPayFlow owns (so it survives a Back-and-forward round
// trip and is what the eventual POST /payment/multi/ body — P3-4 — will be
// built from).
export default function ApartmentsStep({
  complex,
  utility,
  usdRate,
  maintenanceCurrency,
  selections,
  onSelectionsChange,
  onBack,
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

  const selectedCount = rows.filter((r) => selections[r.epcode] != null).length
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
      complex.apartments.filter((row) => row.role === nextFilter).map((row) => row.epcode)
    )
    onSelectionsChange((prev) => {
      const next = {}
      for (const [epcode, amount] of Object.entries(prev)) {
        if (visibleCodes.has(epcode)) next[epcode] = amount
      }
      return next
    })
  }

  // Both setState calls stay OUT of the onSelectionsChange updater — React
  // runs that during the owner component's render, and a setAmounts() in
  // there is a cross-component update mid-render.
  function toggleRow(row) {
    if (selections[row.epcode] != null) {
      onSelectionsChange((prev) => {
        const next = { ...prev }
        delete next[row.epcode] // the displayed amount deliberately stays
        return next
      })
      return
    }
    // Re-checking restores whatever was last typed here, falling back the
    // first time to the full outstanding amount — or to 0 when there is
    // nothing outstanding, since how much to pay ahead is the user's call.
    const amount = amounts[row.epcode] ?? Math.max(0, round2(row.owed))
    setAmounts((a) => ({ ...a, [row.epcode]: amount }))
    onSelectionsChange((prev) => ({ ...prev, [row.epcode]: amount }))
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
    setAmounts((a) => ({ ...a, [row.epcode]: amount }))
    onSelectionsChange((prev) => ({ ...prev, [row.epcode]: amount }))
  }

  return (
    <div className={styles['step3-grid']}>
      <Card>
        <Card.Head>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <Icon name="back" /> {t('common:back')}
            </Button>
            <h3>
              {complex.project} · {t(`pay:utilityLabels.${utility}`)}
            </h3>
          </div>
        </Card.Head>
        <div className={styles['filter-row']}>
          <Seg
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: t(`apartments:roles.${r}`) }))}
            value={roleFilter}
            onChange={handleRoleFilterChange}
            role="tablist"
            aria-label={t('apartments:filterAria')}
          />
        </div>
        <div className={styles['tbl-wrap']}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th />
                <th>{t('pay:tableApartmentHeader')}</th>
                <th className={styles.r}>{t('pay:tableOutstandingHeader')}</th>
                <th className={styles.r}>{t('pay:tableAmountHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const checked = selections[row.epcode] != null
                const owedClass =
                  row.owed > 0 ? styles['owed-neg'] : row.owed < 0 ? styles['owed-pos'] : styles['owed-zero']
                return (
                  <tr
                    key={row.epcode}
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
                        value={checked ? selections[row.epcode] : (amounts[row.epcode] ?? 0)}
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
          {t('pay:selectionFooter', { n: selectedCount, m: rows.length, total: fmt(total, '₾') })}
        </div>
        {/* Says out loud what the table now allows, so a zero-balance row
            doesn't read as a checkbox that does nothing. */}
        <p className={styles['foot-note']}>{t('pay:advanceNote')}</p>
      </Card>

      <Card>
        <Card.Head>
          <h3>{t('pay:summaryTitle')}</h3>
        </Card.Head>
        <Card.Pad>
          <div className={styles['summary-row']}>
            <span className={styles.k}>{t('pay:summaryComplex')}</span>
            <span className={styles.v}>{complex.project}</span>
          </div>
          <div className={styles['summary-row']}>
            <span className={styles.k}>{t('pay:summaryUtility')}</span>
            <span className={styles.v}>{t(`pay:utilityLabels.${utility}`)}</span>
          </div>
          <div className={styles['summary-row']}>
            <span className={styles.k}>{t('pay:summarySelected')}</span>
            <span className={styles.v}>{t('pay:summarySelectedValue', { count: selectedCount })}</span>
          </div>
          {/* Only when a USD->GEL conversion actually happened (live
              maintenance, currency 'USD') — surface the rate used to build
              both the Outstanding column and this total, per the design
              screenshots' "$1 = X₾" line (FLAG, see payFlowData.js's owedFor
              comment). Mock-mode maintenance is GEL-native, so no rate line. */}
          {utility === 'maintenance' && maintenanceCurrency === 'USD' && usdRate != null && (
            <div className={styles['summary-row']}>
              <span className={styles.k}>{t('dashboard:ratesTitle')}</span>
              <span className={styles.v}>{t('pay:rateLine', { rate: usdRate.toFixed(4) })}</span>
            </div>
          )}
          <div className={`${styles['summary-row']} ${styles['summary-total']}`}>
            <span className={styles.k}>{t('pay:payableAmount')}</span>
            <span className={styles.v}>{fmt(total, '₾')}</span>
          </div>
          {/* P3-4: opens the payment-method modal (bank card / Apple Pay /
              open banking / crypto / invoice) with the selections turned
              into payMulti's services[] shape — one entry per checked
              apartment, amount = its editable payable amount, serviceType
              from payFlowData's serviceTypeFor (utility -> finance
              accountType mapping, FLAG see that function's comment). */}
          <Button
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
            disabled={total <= 0}
            onClick={() =>
              openModal(
                <MethodModal
                  complexName={complex.project}
                  utilityLabel={t(`pay:utilityLabels.${utility}`)}
                  amount={total}
                  services={Object.entries(selections).map(([epcode, amt]) => ({
                    epcode,
                    amount: amt,
                    serviceType: serviceTypeFor(utility),
                  }))}
                />,
                { size: 'md' }
              )
            }
          >
            <Icon name="wallet" /> {t('pay:payNow')}
          </Button>
        </Card.Pad>
      </Card>
    </div>
  )
}
