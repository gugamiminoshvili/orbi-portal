import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { fmt } from '../../utils/format'
import { owedFor, round2 } from './payFlowData'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Seg } from '../../components/ui/Badge'
import styles from './PayFlow.module.css'

const ROLE_OPTIONS = ['All', 'Owner']

// Step 3: the apartment checkbox table for the selected complex+utility,
// plus the summary/Pay-Now panel. `selections` is the lifted `{epcode:
// amount}` state MultiPayFlow owns (so it survives a Back-and-forward round
// trip and is what the eventual POST /payment/multi/ body — P3-4 — will be
// built from).
export default function ApartmentsStep({ complex, utility, usdRate, selections, onSelectionsChange, onBack }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [roleFilter, setRoleFilter] = useState('All')

  // Per-row owed amount (see payFlowData's owedFor doc comment for the sign
  // convention: positive = debt/selectable/red, <=0 = credit-or-zero,
  // disabled, rendered with fmt()'s automatic leading '-').
  const rows = useMemo(
    () =>
      complex.apartments
        .filter((row) => roleFilter === 'All' || row.role === roleFilter)
        .map((row) => {
          const owed = owedFor(row, utility, usdRate)
          return { ...row, owed, selectable: owed > 0 }
        }),
    [complex.apartments, utility, usdRate, roleFilter]
  )

  const selectableCount = rows.filter((r) => r.selectable).length
  const selectedCount = rows.filter((r) => r.selectable && selections[r.epcode] != null).length
  const total = Object.values(selections).reduce((sum, v) => sum + (Number(v) || 0), 0)

  function toggleRow(row) {
    onSelectionsChange((prev) => {
      const next = { ...prev }
      if (next[row.epcode] != null) delete next[row.epcode]
      else next[row.epcode] = round2(row.owed)
      return next
    })
  }

  function updateAmount(epcode, raw) {
    const n = parseFloat(raw)
    onSelectionsChange((prev) => ({ ...prev, [epcode]: Number.isNaN(n) ? 0 : Math.max(0, n) }))
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
            onChange={setRoleFilter}
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
                return (
                  <tr key={row.epcode} className={row.selectable ? undefined : styles.credit}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={row.code}
                        checked={checked}
                        disabled={!row.selectable}
                        onChange={() => toggleRow(row)}
                      />
                    </td>
                    <td>{row.code}</td>
                    <td
                      className={styles.r}
                      style={row.selectable ? { color: 'var(--neg-ink)', fontWeight: 600 } : undefined}
                    >
                      {fmt(row.owed, '₾')}
                    </td>
                    <td className={styles.r}>
                      <input
                        type="number"
                        className={styles['amount-input']}
                        min="0"
                        step="0.01"
                        disabled={!checked}
                        value={checked ? selections[row.epcode] : ''}
                        onChange={(e) => updateAmount(row.epcode, e.target.value)}
                        aria-label={`${t('pay:tableAmountHeader')} ${row.code}`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className={styles['tbl-foot']}>
          {t('pay:selectionFooter', { n: selectedCount, m: selectableCount, total: fmt(total, '₾') })}
        </div>
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
          {/* Maintenance is USD at the source — surface the conversion rate
              used to build both the Outstanding column and this total, per
              the design screenshots' "$1 = X₾" line (FLAG, see
              payFlowData.js's owedFor comment). */}
          {utility === 'maintenance' && usdRate != null && (
            <div className={styles['summary-row']}>
              <span className={styles.k}>{t('dashboard:ratesTitle')}</span>
              <span className={styles.v}>{t('pay:rateLine', { rate: usdRate.toFixed(4) })}</span>
            </div>
          )}
          <div className={`${styles['summary-row']} ${styles['summary-total']}`}>
            <span className={styles.k}>{t('pay:payableAmount')}</span>
            <span className={styles.v}>{fmt(total, '₾')}</span>
          </div>
          {/* P3-4 wires this up to open the payment-method modal (bank card /
              Apple Pay / open banking / crypto / invoice) and POST
              /payment/multi/ via payMulti(). Until then it's a stub so the
              button has a visible, non-broken action. */}
          <Button
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
            disabled={total <= 0}
            onClick={() => toast(t('pay:payNowComingSoonToast'))}
          >
            <Icon name="wallet" /> {t('pay:payNow')}
          </Button>
        </Card.Pad>
      </Card>
    </div>
  )
}
