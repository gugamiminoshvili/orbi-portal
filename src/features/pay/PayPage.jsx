import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { getApartment } from '../../api/endpoints/apartments'
import { payService } from '../../api/endpoints/pay'
import { USE_MOCK } from '../../api/client'
import { langToApi } from '../../utils/lang'
import { fmt } from '../../utils/format'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Field, { Input } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Pay.module.css'

// Ported from the `payPage` route (reference/orbi-portal-redesign.html
// lines 1493-1575): a dedicated 3-step checkout page — Amount -> Method ->
// Confirm -> success screen. Kept as a page (not a modal), matching the
// prototype's payShell()/renderPayPage()/payNext()/payConfirm() flow.
const METHODS = [
  { id: 'visa', mi: 'VISA', labelKey: 'visaLabel' },
  { id: 'mc', mi: 'MC', labelKey: 'mcLabel' },
  { id: 'bank', mi: 'BANK', labelKey: 'bankLabel' },
]

export default function PayPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { data: apt, loading } = useAsync(() => getApartment(id), [id])

  // getApartment() resolves undefined for unknown ids — treat that as
  // not-found instead of leaving the skeleton up forever (mirrors
  // ApartmentDetailPage/NewsDetailPage).
  const notFound = !loading && !apt

  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState(null)
  const [method, setMethod] = useState('visa')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  // Real mode only (Task I7): the payment-provider url returned by
  // payService, kept around so [Reopen payment page] can re-open the same
  // tab without another POST /mobileApi/payment/.
  const [paymentUrl, setPaymentUrl] = useState(null)

  useCrumbs(
    apt
      ? [
          { label: t('common:home'), to: '/' },
          { label: t('common:myApartments'), to: '/apartments' },
          { label: apt.code, to: `/apartments/${apt.id}` },
          { label: t('common:pay') },
        ]
      : [{ label: t('common:home'), to: '/' }, { label: t('common:myApartments'), to: '/apartments' }]
  )

  const backLink = (aptId) => (
    <Link
      to={aptId ? `/apartments/${aptId}` : '/apartments'}
      className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`}
      style={{ marginBottom: 18 }}
    >
      <Icon name="back" /> {t('pay:backToApartment')}
    </Link>
  )

  if (notFound) {
    return (
      <div>
        {backLink(null)}
        <Card>
          <EmptyState icon="home" title={t('apartments:notFoundTitle')}>
            <p>
              <Link to="/apartments" style={{ color: 'var(--teal-ink)', fontWeight: 600 }}>
                {t('apartments:allApartments')}
              </Link>
            </p>
          </EmptyState>
        </Card>
      </div>
    )
  }

  if (loading || !apt) {
    return (
      <div>
        {backLink(null)}
        <div className={styles['pay-page']}>
          <Card>
            <div style={{ padding: 22 }}>
              <Skeleton h={14} style={{ marginBottom: 10 }} />
              <Skeleton h={14} style={{ marginBottom: 10 }} />
              <Skeleton h={14} w="60%" style={{ marginBottom: 16 }} />
              <Skeleton h={44} r={11} />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const due = Math.max(0, -apt.balance)
  const amountValue = amount ?? due

  function handleContinueAmount() {
    if (!amountValue || amountValue <= 0) {
      toast(t('pay:invalidAmount'))
      return
    }
    setAmount(amountValue)
    if (USE_MOCK) {
      setStep(2)
      return
    }
    handleRealPay(amountValue)
  }

  // Real mode (Task I7): no Method/Confirm steps — POST /mobileApi/payment/
  // for a hosted-checkout url, open it in a new tab, then show the
  // "payment opened" step with a way to reopen the same tab.
  async function handleRealPay(amt) {
    setProcessing(true)
    const res = await payService(apt.id, { amount: amt, epcode: apt.epcode, lang: langToApi(i18n.language) })
    setProcessing(false)
    setPaymentUrl(res.url)
    window.open(res.url, '_blank', 'noopener')
    setStep(2)
  }

  function reopenPayment() {
    if (paymentUrl) window.open(paymentUrl, '_blank', 'noopener')
  }

  async function handlePay() {
    setProcessing(true)
    const res = await payService(apt.id, { amount: amountValue, method })
    setProcessing(false)
    setResult(res)
    setStep(4)
  }

  return (
    <div>
      {backLink(apt.id)}
      <div className={styles['pay-page']}>
        <Card>
          {step === 1 && (
            <AmountStep
              apt={apt}
              due={due}
              value={amountValue}
              onChange={(v) => setAmount(v)}
              onContinue={handleContinueAmount}
              processing={processing}
              mock={USE_MOCK}
              t={t}
            />
          )}
          {USE_MOCK && step === 2 && (
            <MethodStep
              method={method}
              onSelect={setMethod}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
              t={t}
            />
          )}
          {USE_MOCK && step === 3 && (
            <ConfirmStep
              apt={apt}
              amount={amountValue}
              method={method}
              processing={processing}
              onBack={() => setStep(2)}
              onPay={handlePay}
              t={t}
            />
          )}
          {USE_MOCK && step === 4 && result && <SuccessStep apt={apt} result={result} toast={toast} t={t} />}
          {!USE_MOCK && step === 2 && <PaymentOpenedStep apt={apt} onReopen={reopenPayment} t={t} />}
        </Card>
      </div>
    </div>
  )
}

// `mock` defaults true so every existing call site (MethodStep/ConfirmStep,
// which only ever render in mock mode) keeps the original 3-item header
// byte-identical. Real mode (Task I7) has no Method/Confirm steps, so
// AmountStep/PaymentOpenedStep pass `mock={false}` for the 2-item version.
function StepsHeader({ current, t, mock = true }) {
  const items = mock
    ? [
        [1, t('pay:stepAmount')],
        [2, t('pay:stepMethod')],
        [3, t('pay:stepConfirm')],
      ]
    : [
        [1, t('pay:stepAmount')],
        [2, t('pay:stepPayment')],
      ]
  return (
    <div className={styles.steps}>
      {items.map(([n, label], i) => (
        <div key={n} style={{ display: 'contents' }}>
          <div className={`${styles.stp} ${n === current ? styles.on : n < current ? styles.done : ''}`}>
            <span className={styles.n}>{n < current ? <Icon name="check" size={12} /> : n}</span>
            {label}
          </div>
          {i < items.length - 1 && <span className={styles.ln} />}
        </div>
      ))}
    </div>
  )
}

function AmountStep({ apt, due, value, onChange, onContinue, processing, mock = true, t }) {
  return (
    <>
      <Card.Head>
        <h3>{t('pay:title', { code: apt.code })}</h3>
      </Card.Head>
      <Card.Pad>
        <StepsHeader current={1} t={t} mock={mock} />
        <div className={styles['due-box']}>
          <div className={styles['due-row1']}>
            <span>{apt.building}</span>
            <span className={styles['due-meta']}>
              {t('apartments:block')} {apt.block} · {t('apartments:number')} {apt.number}
            </span>
          </div>
          <div className={styles['due-row2']}>
            <span className={styles['due-label']}>{t('pay:amountDue')}</span>
            <span className={styles['due-amount']}>{fmt(due)}</span>
          </div>
        </div>
        <Field label={t('pay:amountToPay')} htmlFor="payAmt">
          <Input
            id="payAmt"
            type="number"
            min="1"
            step="0.01"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <p className={styles.hint}>{t('pay:partialHint')}</p>
      </Card.Pad>
      <div className={styles.foot}>
        <Link to={`/apartments/${apt.id}`} className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']}`}>
          {t('common:cancel')}
        </Link>
        <Button onClick={onContinue} disabled={processing}>
          {processing && <span className={styles.spin} />}
          {t('common:continue')} <Icon name="arrow" />
        </Button>
      </div>
    </>
  )
}

function MethodStep({ method, onSelect, onBack, onContinue, t }) {
  return (
    <>
      <Card.Head>
        <h3>{t('pay:paymentMethodLabel')}</h3>
      </Card.Head>
      <Card.Pad>
        <StepsHeader current={2} t={t} />
        {METHODS.map((m) => {
          const sel = method === m.id
          return (
            <div
              key={m.id}
              className={`${styles['pay-method']} ${sel ? styles.sel : ''}`}
              tabIndex={0}
              role="radio"
              aria-checked={sel}
              onClick={() => onSelect(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelect(m.id)
              }}
            >
              <div className={styles.mi}>{m.mi}</div>
              <div className={styles['pm-label']}>{t(`pay:${m.labelKey}`)}</div>
              <div className={styles.rad} />
            </div>
          )
        })}
      </Card.Pad>
      <div className={styles.foot}>
        <Button variant="ghost" onClick={onBack}>
          <Icon name="back" /> {t('common:back')}
        </Button>
        <Button onClick={onContinue}>
          {t('common:continue')} <Icon name="arrow" />
        </Button>
      </div>
    </>
  )
}

function ConfirmStep({ apt, amount, method, processing, onBack, onPay, t }) {
  const methodLabel = t(`pay:${METHODS.find((m) => m.id === method).labelKey}`)
  return (
    <>
      <Card.Head>
        <h3>{t('pay:reviewTitle')}</h3>
      </Card.Head>
      <Card.Pad>
        <StepsHeader current={3} t={t} />
        <div className={styles['confirm-box']}>
          <div className={styles['confirm-row']}>
            <span className={styles.k}>{t('pay:apartmentLabel')}</span>
            <span>{apt.code}</span>
          </div>
          <div className={styles['confirm-row']}>
            <span className={styles.k}>{t('pay:paymentMethodLabel')}</span>
            <span>{methodLabel}</span>
          </div>
          <div className={`${styles['confirm-row']} ${styles.total}`}>
            <span className={styles.k}>{t('pay:totalLabel')}</span>
            <span className={styles['total-amount']}>{fmt(amount)}</span>
          </div>
        </div>
        <p className={styles.hint}>{t('pay:authNotice')}</p>
      </Card.Pad>
      <div className={styles.foot}>
        <Button variant="ghost" onClick={onBack} disabled={processing}>
          <Icon name="back" /> {t('common:back')}
        </Button>
        <Button onClick={onPay} disabled={processing}>
          {processing && <span className={styles.spin} />}
          {t('pay:payAmount', { amount: fmt(amount) })}
        </Button>
      </div>
    </>
  )
}

function SuccessStep({ apt, result, toast, t }) {
  return (
    <div className={styles.success}>
      <div className={styles['success-ring']}>
        <Icon name="check" size={34} />
      </div>
      <h3 className={styles['success-title']}>{t('pay:successTitle')}</h3>
      <p className={styles['success-sub']}>{t('pay:paidFor', { amount: fmt(result.amount), code: apt.code })}</p>
      <p className={styles['ref-line']}>{t('pay:refLine', { ref: result.ref })}</p>
      <div className={styles['success-actions']}>
        <Button variant="ghost" onClick={() => toast(t('pay:receiptDownloadedToast'))}>
          <Icon name="dl" /> {t('pay:receipt')}
        </Button>
        <Link to={`/apartments/${apt.id}`} className={`${buttonStyles.btn} ${buttonStyles['btn-primary']}`}>
          {t('pay:backToApartment')}
        </Link>
      </div>
    </div>
  )
}

// Real mode only (Task I7): replaces the mock wizard's Method/Confirm/Success
// steps. payService's POST already ran and opened the hosted-checkout url in
// a new tab (see PayPage's handleRealPay) — this step just confirms that and
// offers to reopen it, since the new tab can be closed or lost by accident.
function PaymentOpenedStep({ apt, onReopen, t }) {
  return (
    <>
      <Card.Head>
        <h3>{t('pay:title', { code: apt.code })}</h3>
      </Card.Head>
      <Card.Pad>
        <StepsHeader current={2} t={t} mock={false} />
        <div className={styles.success}>
          <div className={styles['success-ring']}>
            <Icon name="card" size={34} />
          </div>
          <h3 className={styles['success-title']}>{t('pay:paymentOpenedTitle')}</h3>
          <p className={styles['success-sub']}>{t('pay:paymentOpenedBody')}</p>
        </div>
      </Card.Pad>
      <div className={styles.foot}>
        <Button variant="ghost" onClick={onReopen}>
          <Icon name="share" /> {t('pay:reopen')}
        </Button>
        <Link to={`/apartments/${apt.id}`} className={`${buttonStyles.btn} ${buttonStyles['btn-primary']}`}>
          {t('pay:backToApartment')}
        </Link>
      </div>
    </>
  )
}
