import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { payMulti, downloadInvoice, getPaymentMethods } from '../../api/endpoints/pay'
import { openPaymentTab } from '../../utils/paymentTab'
import { langToApi } from '../../utils/lang'
import { fmt } from '../../utils/format'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import modalStyles from '../../context/Modal.module.css'
import styles from './MethodModal.module.css'

// The method picker Pay Now opens (ApartmentsStep), laid out after the
// "Select Payment Method" design: the amount on a green panel, then one row
// per method with its limit and fee, and a single action at the bottom that
// says what happens next. The methods, their limits and fees come from
// GET /persCabApi/paymentMethods/ (getPaymentMethods); the fee is shown per
// row only - the provider charges it after the redirect, nothing here adds it
// to the request (owner call 2026-10-28: no fee/total breakdown).
//
// Rows are told apart by `id`: the list can hold two "card" rows with
// different limits. `key` decides the icon, the label and how payMulti flags
// the request.

const KEY_ALIASES = { apple_pay: 'applepay', google_pay: 'googlepay', online_bank: 'bank', open_banking: 'bank' }
const normKey = (k) => KEY_ALIASES[k] || k
const ICON_BY_KEY = { card: 'card', applepay: 'wallet', googlepay: 'wallet', bank: 'building', crypto: 'swap', invoice: 'doc' }

// The invoice is a document, not a provider - if the list does not carry it,
// it is still offered, last, as the design has it.
const INVOICE_ROW = { id: null, key: 'invoice', title: 'Invoice', max: null, feePct: null, maxFee: null }

// FLAG (backend-Q #1, still open): these ids double as the `vendor` sent with
// an online-bank payment. No logos ship with the app, so each bank gets a
// coloured initials tile instead of its brand mark.
const BANKS = [
  { id: 'bog', name: 'Bank of Georgia', initials: 'BG', color: '#F26722' },
  { id: 'tbc', name: 'TBC Bank', initials: 'TBC', color: '#00A3E0' },
  { id: 'credo', name: 'Credo Bank', initials: 'CB', color: '#E4412B' },
  { id: 'liberty', name: 'Liberty Bank', initials: 'LB', color: '#111111' },
]

// Limits read as round figures (Max 1,500 ₾); a fee keeps one decimal (2.0 %).
const fmtLimit = (n) => (Number.isInteger(n) ? `${n.toLocaleString('en-US')} ₾` : fmt(n, '₾'))
const fmtPct = (p) => (Number.isInteger(p) ? p.toFixed(1) : String(p))

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
// (ApartmentsStep derives it from its selections). `amount` is the summary
// panel's payable total - shown on the green panel and checked against each
// method's limit.
export default function MethodModal({ complexName, utilityLabel, amount, services }) {
  const { t, i18n } = useTranslation()
  const { closeModal, setModalLocked } = useModal()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(getPaymentMethods, [])

  // If this modal unmounts mid-request, the shared lock must not stay on for
  // whatever modal opens next.
  useEffect(() => () => setModalLocked(false), [setModalLocked])

  const [selectedId, setSelectedId] = useState(null) // row index, see rowKey
  const [busy, setBusy] = useState(false)
  const [opened, setOpened] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [blocked, setBlocked] = useState(false)

  const methods = data ? (data.some((m) => normKey(m.key) === 'invoice') ? data : [...data, INVOICE_ROW]) : []
  const rowKey = (m, i) => `${m.id ?? 'x'}-${i}`
  const selectedIndex = methods.findIndex((m, i) => rowKey(m, i) === selectedId)
  const selected = selectedIndex >= 0 ? methods[selectedIndex] : null
  const selKey = selected ? normKey(selected.key) : null
  const overMax = (m) => m.max != null && amount > m.max

  async function pay(bankVendor) {
    if (!selected || busy || overMax(selected)) return
    setBusy(true)
    // Locked for the duration of the request: ESC or a backdrop click must not
    // dismiss the modal mid-POST.
    setModalLocked(true)
    try {
      if (selKey === 'invoice') {
        const res = await payMulti({ services, method: 'invoice', methodId: selected.id ?? undefined, lang: langToApi(i18n.language) })
        // FLAG (backend-Q #4, still open): the as_invoice response shape is
        // unconfirmed; the invoice id is looked for under these names.
        const invoiceId = res?.invoiceId ?? res?.invoice_id ?? res?.id
        const blob = await downloadInvoice(invoiceId)
        saveBlob(blob, 'invoice.pdf')
        toast(t('pay:invoiceDownloadedToast'))
        // Unlock before closing - closeModal() is a no-op while locked.
        setModalLocked(false)
        closeModal()
        return
      }
      const res = await payMulti({
        services,
        method: selKey,
        methodId: selected.id,
        bankVendor: selKey === 'bank' ? bankVendor : undefined,
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

  const label = (m) => t(`pay:methods.${normKey(m.key)}`, { defaultValue: m.title || m.name })

  return (
    <>
      <div className={styles.head}>
        <div>
          <h3>{t('pay:methodModalTitle')}</h3>
          <p>{t('pay:methodModalSubtitle', { complex: complexName, utility: utilityLabel })}</p>
        </div>
        <button type="button" className={modalStyles['modal-x']} aria-label={t('common:close')} onClick={closeModal}>
          ✕
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.amount}>
          <span>{t('pay:initialAmount')}</span>
          <b>{fmt(amount, '₾')}</b>
        </div>

        {loading && [0, 1, 2, 3].map((i) => <Skeleton key={i} h={60} r={12} style={{ marginBottom: 12 }} />)}
        {!loading && error && (
          <div className={styles.failed}>
            <p>{t('common:requestFailed')}</p>
            <Button variant="ghost" size="sm" onClick={reload}>
              <Icon name="reload" /> {t('common:retry')}
            </Button>
          </div>
        )}

        {methods.map((m, i) => {
          const key = normKey(m.key)
          const id = rowKey(m, i)
          const isSel = selectedId === id
          const over = overMax(m)
          const isInvoice = key === 'invoice'
          const row = (
            <button
              type="button"
              className={`${styles.method} ${isSel ? styles.on : ''}`}
              aria-pressed={isSel}
              disabled={over || busy}
              onClick={() => setSelectedId(isSel && key === 'bank' ? null : id)}
            >
              <span className={styles.mic}>
                <Icon name={ICON_BY_KEY[key] || 'wallet'} />
              </span>
              <span className={styles.mtext}>
                <b>{label(m)}</b>
                <small className={over ? styles.over : ''}>
                  {isInvoice ? t('pay:methodPdfSub') : m.max != null ? t('pay:methodMaxSub', { max: fmtLimit(m.max) }) : ''}
                </small>
              </span>
              <span className={styles.mfee}>
                {isInvoice ? (
                  t('pay:methodDownload')
                ) : (
                  <>
                    {m.feePct != null && <span>{t('pay:feeShort', { pct: fmtPct(m.feePct) })}</span>}
                    {m.maxFee != null && <span>{t('pay:maxFeeShort', { max: fmtLimit(m.maxFee) })}</span>}
                  </>
                )}
              </span>
            </button>
          )
          // Online bank opens into its banks; picking one starts the payment.
          if (key === 'bank' && isSel) {
            return (
              <div key={id} className={styles.bankbox}>
                {row}
                <div className={styles.banks} role="group" aria-label={t('pay:chooseBankLabel')}>
                  {BANKS.map((b) => (
                    <button key={b.id} type="button" className={styles.bank} disabled={busy} onClick={() => pay(b.id)}>
                      <span className={styles.blogo} style={{ background: b.color }}>{b.initials}</span>
                      <span className={styles.bname}>{b.name}</span>
                      <Icon name="share" />
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          return <div key={id}>{row}</div>
        })}
      </div>
      <div className={styles.foot}>
        {!selected || selKey === 'bank' ? (
          <p className={styles.hint}>{t(selKey === 'bank' ? 'pay:chooseBankLabel' : 'pay:selectMethodHint')}</p>
        ) : (
          <Button className={styles.go} disabled={busy} onClick={() => pay()}>
            {t(selKey === 'invoice' ? 'pay:methodDownload' : 'common:continue')}
          </Button>
        )}
      </div>
    </>
  )
}
