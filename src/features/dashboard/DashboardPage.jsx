import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { getCommunals, getRates } from '../../api/endpoints/dashboard'
import { fmtNum } from '../../utils/format'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import rulesArt from '../../assets/rules.png'
import contactArt from '../../assets/contact.png'
import styles from './Dashboard.module.css'

// One combined fetch so the page shows a single skeleton rather than tiles
// popping in independently.
async function loadDashboard() {
  const [communals, rates] = await Promise.all([getCommunals(), getRates()])
  return { communals, rates }
}

function usdGelRate(rates) {
  const row = rates?.rates?.find((r) => r.pair === 'USD/GEL')
  return row ? row.rate : null
}

export default function DashboardPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home') }])

  const { data, loading } = useAsync(loadDashboard, [])

  const head = (
    <div className={styles['page-head']}>
      <h1>{t('dashboard:title')}</h1>
    </div>
  )

  if (loading || !data) {
    return (
      <div>
        {head}
        <DashboardSkeleton />
      </div>
    )
  }

  const { communals, rates } = data
  const usdRate = usdGelRate(rates)

  // Owner call (2026-09-03): every figure on this card is shown in GEL, so
  // the one line that can arrive in another currency is converted here —
  // by the same rule and from the same NBG rate payFlowData.owedFor already
  // applies, so the dashboard and the pay flow can never disagree. LIVE
  // maintenance is USD, mock is already GEL. With no rate to hand, the raw
  // magnitude is shown rather than nothing.
  const serviceCurrency = communals.maintenance.currency || 'USD'
  const serviceOwed =
    serviceCurrency !== 'GEL' && usdRate != null
      ? communals.maintenance.owed * usdRate
      : communals.maintenance.owed

  const debts = [
    {
      key: 'service',
      icon: 'doc',
      tone: 'neg',
      color: 'var(--neg)',
      label: t('dashboard:serviceLabel'),
      value: serviceOwed,
    },
    {
      key: 'electricity',
      icon: 'bolt',
      tone: 'warn',
      color: 'var(--warn)',
      label: t('dashboard:electricityLabel'),
      value: communals.utilities.electricitySum,
    },
    {
      key: 'internet',
      icon: 'wifi',
      tone: 'info',
      color: 'var(--info)',
      label: t('dashboard:internetLabel'),
      // The backend's own figure (`internet_debt_sum`), on the owner's call
      // (2026-09-03). This card used to derive it instead, walking the
      // apartment list and charging tariff + penalty for any agreement with
      // under 14 days left — a rule the aggregate does not apply. Reading
      // the field means the dashboard now says whatever the backend says,
      // and costs one request fewer.
      value: communals.utilities.internetSum,
    },
  ]

  // One currency means the three lines finally add up, so the card can state
  // a single total. A credit counts against it, which is why this is a plain
  // sum and not a sum of the positives.
  const total = debts.reduce((sum, d) => sum + d.value, 0)

  // The bar states "one whole split into parts", so only what is owed can be
  // a part of it: a credit is not a slice of a debt. When nothing is owed
  // the bar is left as an empty track rather than being hidden, so the card
  // keeps its shape whatever the numbers do.
  const owedTotal = debts.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  const segments =
    owedTotal > 0
      ? debts
          .filter((d) => d.value > 0)
          .map((d) => ({ key: d.key, color: d.color, pct: (d.value / owedTotal) * 100 }))
      : []

  return (
    <div>
      {head}

      <div className={styles['top-grid']}>
        <Card className={styles['debt-card']}>
          <Card.Pad className={styles['debt-pad']}>
            <div className={styles['debt-head']}>
              <div className={styles['debt-titles']}>
                <h3>{t('dashboard:totalDebtTitle')}</h3>
                <span className={styles['debt-sub']}>{t('dashboard:totalDebtSubtitle')}</span>
              </div>
              <div className={styles['debt-total']} data-total>
                <span className={styles['debt-total-lbl']}>{t('dashboard:totalLabel')}</span>
                <span
                  className={`${styles['debt-total-val']} ${total < 0 ? styles.ahead : ''}`}
                  data-state={total > 0 ? 'owed' : total < 0 ? 'ahead' : 'settled'}
                >
                  {fmtNum(total)}
                  <span className={styles.cur}>₾</span>
                </span>
              </div>
            </div>

            <Bar segments={segments} />

            <ul className={styles['debt-list']}>
              {debts.map(({ key, ...d }) => (
                <DebtRow key={key} {...d} />
              ))}
            </ul>

            {/* Never disabled: paying into an account that owes nothing is
                a deliberate feature (advance payment, owner call
                2026-08-06), so a zero total is not a reason to block it.
                The button carries no amount — it opens the multi-pay flow,
                where the owner picks apartments and services, so a figure
                printed here would be a promise that flow does not keep
                (owner call 2026-09-03). */}
            <Link
              to="/pay"
              className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['pay-btn']}`}
            >
              <Icon name="card" /> {t('dashboard:payNow')}
            </Link>
          </Card.Pad>
        </Card>

        {rates && (
          <Card className={styles['rates-card']}>
            <Card.Head>
              <div className={styles['rates-head']}>
                <span className={styles['rates-icon']}>
                  <Icon name="swap" />
                </span>
                <h3>{t('dashboard:ratesTitle')}</h3>
              </div>
            </Card.Head>
            <Card.Pad className={styles['rates-pad']}>
              <div className={styles['rate-list']}>
                {rates.rates.map((r) => {
                  const up = r.delta >= 0
                  return (
                    <div key={r.pair} className={styles['rate-row']}>
                      <span className={styles.k}>1 {r.pair.replace('/', ' / ')}</span>
                      <span className={styles.v}>{r.rate.toFixed(4)}</span>
                      <span className={`${styles.delta} ${up ? styles.pos : styles.neg}`}>
                        {up ? '▲' : '▼'} {Math.abs(r.delta).toFixed(4)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className={styles['rates-foot']}>
                <span>{t('dashboard:ratesOngoing')}</span>
                <span>{t('dashboard:ratesSource', { source: rates.source })}</span>
              </div>
            </Card.Pad>
          </Card>
        )}
      </div>

      <div className={styles['links-grid']}>
        <LinkCard to="/guides/service" tone="pos" icon="wrench"
          title={t('dashboard:serviceCardTitle')} sub={t('dashboard:serviceCardSub')} />
        <LinkCard to="/guides/handover" tone="info" icon="building"
          title={t('dashboard:handoverCardTitle')} sub={t('dashboard:handoverCardSub')} />
        <LinkCard to="/guides/power-of-attorney" tone="violet" icon="user"
          title={t('dashboard:poaCardTitle')} sub={t('dashboard:poaCardSub')} />
      </div>

      <div className={styles['wide-grid']}>
        {/* Both actions land on the same page, deliberately (owner call
            2026-09-03): the button is what makes this card look and behave
            like the Contact Centre card beside it, and without it the body
            copy sits alone against the artwork. */}
        <WideCard
          tone="pos"
          icon="doc"
          title={t('dashboard:rulesTitle')}
          body={t('dashboard:rulesBody')}
          action={t('dashboard:rulesAction')}
          actionTo="/rules"
          viewAll={t('dashboard:viewAll')}
          viewAllTo="/rules"
          art={rulesArt}
        />
        <WideCard
          tone="info"
          icon="chat"
          title={t('dashboard:contactTitle')}
          body={t('dashboard:contactBody')}
          action={t('dashboard:contactAction')}
          actionTo="/support/new"
          viewAll={t('dashboard:viewAll')}
          viewAllTo="/support"
          art={contactArt}
        />
      </div>
    </div>
  )
}

// One debt cell: tinted icon tile, label, amount. The amount's colour states
// what the number means — owed is red, settled is neutral, and a credit is
// green (utils/balance.js's convention, applied to display here).
function DebtRow({ icon, tone, color, label, value }) {
  const owed = value > 0
  const ahead = value < 0
  return (
    <li className={styles['debt-row']}>
      <span className={`${styles['debt-ic']} ${styles[tone]}`}>
        <Icon name={icon} />
      </span>
      <div className={styles['debt-label']}>
        {/* The one thing tying this cell to its slice of the bar above:
            same solid colour, so the reader can match them at a glance.
            Decorative — the label beside it already names the service, and
            nothing here is stated by colour alone. */}
        <span className={styles['debt-dot']} style={{ background: color }} aria-hidden="true" />
        {label}
      </div>
      <div
        // Also exposed as data, not only as colour: the state is then
        // assertable in a test and readable in devtools without decoding
        // a hashed class name.
        data-state={owed ? 'owed' : ahead ? 'ahead' : 'settled'}
        className={`${styles['debt-value']} ${owed ? styles.owed : ''} ${ahead ? styles.ahead : ''}`}
      >
        {fmtNum(value)}
        <span className={styles.cur}>₾</span>
      </div>
    </li>
  )
}

// The debt split as one horizontal bar rather than a ring (owner call
// 2026-09-03). Percentages are pre-computed by the caller, so this is pure
// layout: an empty track when nothing is owed, otherwise one flex child per
// paying segment. Decorative — the same numbers are read out by the cells
// below it, so it is hidden from assistive tech.
function Bar({ segments }) {
  return (
    <div className={styles.bar} aria-hidden="true" data-bar>
      {segments.map((s) => (
        <span key={s.key} style={{ width: `${s.pct}%`, background: s.color }} />
      ))}
    </div>
  )
}

function LinkCard({ to, tone, icon, title, sub }) {
  return (
    <Link to={to} className={`${styles['link-card']}`}>
      <span className={`${styles['link-ic']} ${styles[tone]}`}>
        <Icon name={icon} />
      </span>
      <span className={styles['link-body']}>
        <span className={styles['link-title']}>{title}</span>
        <span className={styles['link-sub']}>{sub}</span>
      </span>
      <Icon name="chevron-right" className={styles['link-go']} />
    </Link>
  )
}

function WideCard({ tone, icon, title, body, action, actionTo, viewAll, viewAllTo, art }) {
  return (
    <Card className={styles['wide-card']}>
      <div className={styles['wide-head']}>
        <span className={styles['wide-titlewrap']}>
          <span className={`${styles['wide-ic']} ${styles[tone]}`}>
            <Icon name={icon} />
          </span>
          <h3>{title}</h3>
        </span>
        {viewAllTo ? (
          <Link to={viewAllTo} className={styles['view-all']}>
            {viewAll} <Icon name="chevron-right" size={14} />
          </Link>
        ) : (
          <span className={`${styles['view-all']} ${styles.inert}`}>
            {viewAll} <Icon name="chevron-right" size={14} />
          </span>
        )}
      </div>
      <div className={styles['wide-body']}>
        <div className={styles['wide-text']}>
          <p>{body}</p>
          {/* A card without an `action` carries none — its heading link is
              the way in. */}
          {action &&
            (actionTo ? (
              <Link to={actionTo} className={`${buttonStyles.btn} ${buttonStyles['btn-soft']} ${buttonStyles['btn-sm']}`}>
                {action}
              </Link>
            ) : (
              <span className={`${buttonStyles.btn} ${buttonStyles['btn-soft']} ${buttonStyles['btn-sm']} ${styles.inert}`}>
                {action}
              </span>
            ))}
        </div>
        {/* Decorative: it repeats what the title already says, so it is
            hidden from assistive tech rather than given a description. */}
        <img src={art} alt="" aria-hidden="true" className={styles['wide-art']} />
      </div>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className={styles['top-grid']}>
        <Card><div style={{ padding: 22 }}><Skeleton h={150} r={14} /></div></Card>
        <Card><div style={{ padding: 22 }}><Skeleton h={150} r={14} /></div></Card>
      </div>
      <div className={styles['links-grid']}>
        {[0, 1, 2].map((i) => (
          <Card key={i}><div style={{ padding: 18 }}><Skeleton h={44} r={12} /></div></Card>
        ))}
      </div>
    </>
  )
}
