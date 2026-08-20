import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { payMulti, downloadInvoice } from '../../api/endpoints/pay'
import { openPaymentTab } from '../../utils/paymentTab'
import { langToApi } from '../../utils/lang'
import { fmt } from '../../utils/format'
import { round2 } from './payFlowData'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import modalStyles from '../../context/Modal.module.css'

// P3-4: the method-picker modal Pay Now opens from ApartmentsStep, wired to
// POST /mobileApi/payment/multi/ (payMulti). Per the design doc's decisions
// table + screenshots (docs/specs/2026-07-17-dashboard-multipay-design.md).
//
// FLAG (backend-Q #2, "fees/limits source of truth" — still open): fees and
// per-method limits below are hardcoded from the screenshots, not from any
// API. The modal now shows the fee and the resulting total (owner call
// 2026-08-07), but it is still NOT added to what gets POSTed: the provider
// charges its own fee after the redirect. If these percentages ever drift
// from the provider's real ones, the total shown here becomes a lie — which
// is the strongest reason yet to get them from the API.
const METHODS = [
  { id: 'card', icon: 'card', feePct: 2.5, max: 3000 },
  { id: 'applepay', icon: 'wallet', feePct: 2.5, max: 3000 },
  { id: 'bank', icon: 'building', feePct: 0.6, max: 50000, expandsBanks: true },
  { id: 'crypto', icon: 'swap', feePct: 0.6, max: 100000 },
  { id: 'invoice', icon: 'dl', isInvoice: true },
]

// FLAG (backend-Q #1, "vendor values (bank keys?)" — still open): these ids
// double as the `vendor` string sent to payMulti's `bankVendor`. The global
// constraint bans external logo images, so each bank gets a plain colored
// initials tile instead of a real brand mark — colors are arbitrary, not
// official brand colors.
const BANKS = [
  { id: 'bog', name: 'Bank of Georgia', initials: 'BG', color: '#8E2A38' },
  { id: 'tbc', name: 'TBC Bank', initials: 'TBC', color: '#0B6E4F' },
  { id: 'credo', name: 'Credo Bank', initials: 'CB', color: '#B8860B' },
  { id: 'liberty', name: 'Liberty Bank', initials: 'LB', color: '#4B3F72' },
]

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// `services` is the already-built [{epcode, amount, serviceType}] array
// (ApartmentsStep derives it from `selections` via payFlowData's
// serviceTypeFor — this component stays decoupled from that mapping so it
// can be unit tested on its own). `amount` is the summary panel's payable
// total, used only for the green banner and the over-max check.
export default function MethodModal({ complexName, utilityLabel, amount, services }) {
  const { t, i18n } = useTranslation()
  const { closeModal, setModalLocked } = useModal()
  const toast = useToast()

  // Same unmount cleanup as ElectricityReportModal: if this modal unmounts
  // while a request is in flight, the shared lock must not stay stuck on
  // for whatever modal opens next.
  useEffect(() => () => setModalLocked(false), [setModalLocked])

  const [method, setMethod] = useState(null)
  const [bank, setBank] = useState(null)
  const [busy, setBusy] = useState(false)
  // Redirect methods (card/applepay/bank/crypto) POST payMulti, open the
  // returned url in a new tab, then this flips true to show an in-modal
  // "payment opened" confirmation instead of closing outright — mirrors v1
  // PayPage's PaymentOpenedStep (retired in P3-3, see git history) but
  // inline within the modal rather than a page step.
  const [opened, setOpened] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [blocked, setBlocked] = useState(false)

  const methodDef = METHODS.find((m) => m.id === method)
  // Null until a method that actually charges a fee is picked: the invoice is
  // a document, not a payment, so it has no percentage of its own.
  const feePct = methodDef?.feePct ?? null
  const feeAmount = feePct == null ? 0 : round2((amount * feePct) / 100)
  const total = round2(amount + feeAmount)
  const canContinue =
    Boolean(method) &&
    (method !== 'bank' || Boolean(bank)) &&
    !(methodDef?.max != null && amount > methodDef.max)

  function selectMethod(m) {
    if (m.max != null && amount > m.max) return
    setMethod(m.id)
    if (m.id !== 'bank') setBank(null)
  }

  async function handleContinue() {
    if (!canContinue || busy) return
    setBusy(true)
    // Lock the modal for the duration of the request (ElectricityReportModal's
    // "generating" pattern): without this, ESC/overlay-click could dismiss the
    // modal mid-POST and the response would fire against a closed modal.
    setModalLocked(true)
    try {
      if (method === 'invoice') {
        const res = await payMulti({ services, method, lang: langToApi(i18n.language) })
        // FLAG (backend-Q #4, "invoice flow ... how to fetch the PDF" —
        // still open): the as_invoice response shape is unconfirmed;
        // assumes the invoice id comes back under one of these names so it
        // can be handed to GET /payment/invoice/ (downloadInvoice).
        const invoiceId = res?.invoiceId ?? res?.invoice_id ?? res?.id
        const blob = await downloadInvoice(invoiceId)
        saveBlob(blob, 'invoice.pdf')
        toast(t('pay:invoiceDownloadedToast'))
        // Unlock BEFORE closing — closeModal() is a deliberate no-op while
        // the lock is on (see ModalContext's lockedRef), so closing from
        // inside the locked section requires releasing the lock first.
        setModalLocked(false)
        closeModal()
        return
      }
      const res = await payMulti({
        services,
        method,
        bankVendor: method === 'bank' ? bank : undefined,
        lang: langToApi(i18n.language),
      })
      setPaymentUrl(res.url)
      setBlocked(!openPaymentTab(res.url))
      setOpened(true)
    } catch {
      toast(t('common:requestFailed'))
    } finally {
      setBusy(false)
      setModalLocked(false)
    }
  }

  function handleReopen() {
    if (paymentUrl && openPaymentTab(paymentUrl)) setBlocked(false)
  }

  if (opened) {
    return (
      <>
        <div className={modalStyles['modal-head']}>
          <h3>{t('pay:methodModalTitle')}</h3>
          <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className={modalStyles['modal-body']} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-soft)', color: 'var(--teal-ink)',
              display: 'grid', placeItems: 'center', margin: '6px auto 16px',
            }}
          >
            <Icon name="card" size={30} />
          </div>
          <h3 style={{ margin: '0 0 6px' }}>
            {t(blocked ? 'pay:paymentBlockedTitle' : 'pay:paymentOpenedTitle')}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            {t(blocked ? 'pay:paymentBlockedBody' : 'pay:paymentOpenedBody')}
          </p>
        </div>
        <div className={modalStyles['modal-foot']}>
          <Button variant="ghost" onClick={handleReopen}>
            <Icon name="share" /> {t('pay:reopen')}
          </Button>
          <Button onClick={closeModal}>{t('common:close')}</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('pay:methodModalTitle')}</h3>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={modalStyles['modal-body']}>
        <p style={{ margin: '-4px 0 14px', color: 'var(--muted)', fontSize: 13 }}>
          {t('pay:methodModalSubtitle', { complex: complexName, utility: utilityLabel })}
        </p>
        {/* Amount, then what the chosen method adds on top. The fee is
            DISPLAY-ONLY: `services[].amount` still carries the base figures,
            because the provider charges its own fee after the redirect rather
            than this app adding it to the request. Showing it here means the
            payer is not surprised by a larger charge on the provider's page. */}
        <div
          style={{
            padding: '12px 16px', borderRadius: 12, background: 'var(--pos-bg)', color: 'var(--pos-ink)',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontWeight: 600, fontSize: 13.5,
            }}
          >
            <span>{t('pay:amountToPayLabel')}</span>
            <span style={{ fontSize: 17 }}>{fmt(amount, '₾')}</span>
          </div>

          {feePct != null ? (
            <div
              style={{
                marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--teal-line)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span>{t('pay:feeLabel', { pct: feePct })}</span>
                <span>+{fmt(feeAmount, '₾')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700 }}>
                <span>{t('pay:totalLabel')}</span>
                <span>{fmt(total, '₾')}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {t(methodDef ? 'pay:feeNone' : 'pay:feeHint')}
            </div>
          )}
        </div>

        {METHODS.map((m) => {
          const overMax = m.max != null && amount > m.max
          const selected = method === m.id
          return (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={overMax}
                onClick={() => selectMethod(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                  border: `1.5px solid ${selected ? 'var(--teal)' : 'var(--line-2)'}`,
                  background: selected ? 'var(--teal-tint)' : 'var(--card)',
                  opacity: overMax ? 0.55 : 1,
                  borderRadius: 12, padding: '14px 16px', cursor: overMax ? 'default' : 'pointer', textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 42, height: 42, borderRadius: 11, background: 'var(--teal-soft)', color: 'var(--teal-ink)',
                    display: 'grid', placeItems: 'center', flex: 'none',
                  }}
                >
                  <Icon name={m.icon} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{t(`pay:methods.${m.id}`)}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
                    {m.isInvoice ? t('pay:methodPdfSub') : t('pay:methodMaxSub', { max: fmt(m.max, '₾') })}
                  </span>
                </span>
                <span style={{ fontWeight: 700, fontSize: m.isInvoice ? 13 : 14, flex: 'none' }}>
                  {m.isInvoice ? t('pay:methodDownload') : `${m.feePct}%`}
                </span>
              </button>
              {overMax && (
                <p style={{ margin: '6px 2px 0', fontSize: 11.5, color: 'var(--neg-ink)' }}>
                  {t('pay:methodOverMaxNote')}
                </p>
              )}
              {m.expandsBanks && selected && (
                <div style={{ marginTop: 10, paddingLeft: 8 }}>
                  <div
                    style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
                      color: 'var(--muted)', margin: '0 0 8px',
                    }}
                  >
                    {t('pay:chooseBankLabel')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {BANKS.map((b) => {
                      const bSelected = bank === b.id
                      return (
                        <button
                          key={b.id}
                          type="button"
                          aria-pressed={bSelected}
                          onClick={() => setBank(b.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            border: `1.5px solid ${bSelected ? 'var(--teal)' : 'var(--line-2)'}`,
                            background: bSelected ? 'var(--teal-tint)' : 'var(--card)',
                            borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span
                            style={{
                              // The tile sits on the bank's own brand colour, which is fixed
                              // in both themes — so the label is literally white, not --on-accent.
                              width: 30, height: 30, borderRadius: 8, background: b.color, color: '#fff',
                              fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none',
                            }}
                          >
                            {b.initials}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={closeModal}>{t('common:cancel')}</Button>
        <Button disabled={!canContinue || busy} onClick={handleContinue}>
          {t('common:continue')}
        </Button>
      </div>
    </>
  )
}
