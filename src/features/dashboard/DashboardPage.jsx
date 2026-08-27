import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { getCommunals, getRates } from '../../api/endpoints/dashboard'
import { listApartments } from '../../api/endpoints/apartments'
import { fmtNum } from '../../utils/format'
import { internetDue } from './internetDue'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Dashboard.module.css'

// One combined fetch so the page shows a single skeleton rather than tiles
// popping in independently. The apartment list is needed for the internet
// rule above: the per-flat agreement (days left / tariff / penalty) lives
// there, not on the communals aggregate.
async function loadDashboard() {
  const [communals, rates, apartments] = await Promise.all([
    getCommunals(),
    getRates(),
    listApartments(),
  ])
  return { communals, rates, apartments }
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

  const { communals, rates, apartments } = data
  const usdRate = usdGelRate(rates)

  // LIVE maintenance arrives in USD, mock in GEL — the same currency-
  // conditional rule payFlowData.owedFor uses.
  const serviceCurrency = communals.maintenance.currency || 'USD'
  const serviceSymbol = serviceCurrency === 'GEL' ? '₾' : '$'

  const debts = [
    {
      key: 'service',
      icon: 'doc',
      tone: 'neg',
      color: 'var(--neg)',
      label: t('dashboard:serviceDebt'),
      value: communals.maintenance.owed,
      symbol: serviceSymbol,
      // Only this line can be in a foreign currency, so it is the only one
      // the donut has to convert (see chartValue below).
      currency: serviceCurrency,
    },
    {
      key: 'electricity',
      icon: 'bolt',
      tone: 'warn',
      color: 'var(--warn)',
      label: t('dashboard:electricityDebt'),
      value: communals.utilities.electricitySum,
      symbol: '₾',
      currency: 'GEL',
    },
    {
      key: 'internet',
      icon: 'globe',
      tone: 'info',
      color: 'var(--info)',
      label: t('dashboard:internetDebt'),
      value: internetDue(apartments),
      symbol: '₾',
      currency: 'GEL',
    },
  ]

  // The donut states "one whole split into parts", so the parts have to be
  // comparable: the USD line is converted to GEL for the geometry only. No
  // converted figure is ever printed — the centre carries the word "Total"
  // and nothing else (owner call 2026-08-07), precisely so the chart never
  // has to claim a single cross-currency number.
  const segments = debts
    .map((d) => ({
      key: d.key,
      color: d.color,
      // A credit is not a slice of a debt; only what is owed is drawn.
      value: Math.max(
        0,
        d.currency !== 'GEL' && usdRate != null ? d.value * usdRate : d.value
      ),
    }))
    .filter((s) => s.value > 0)

  return (
    <div>
      {head}

      <div className={styles['top-grid']}>
        <Card className={styles['debt-card']}>
          <Card.Pad className={styles['debt-pad']}>
            <div className={styles['debt-main']}>
              <div className={styles['debt-titles']}>
                <h3>{t('dashboard:totalDebtTitle')}</h3>
                <span className={styles['debt-sub']}>{t('dashboard:totalDebtSubtitle')}</span>
              </div>
              <ul className={styles['debt-list']}>
                {debts.map(({ key, ...d }) => (
                  <DebtRow key={key} {...d} />
                ))}
              </ul>
            </div>

            <div className={styles['debt-aside']}>
              <Donut segments={segments} label={t('dashboard:donutTotal')} />
              {/* Never disabled: paying into an account that owes nothing is
                  a deliberate feature (advance payment, owner call
                  2026-08-06), so a zero total is not a reason to block it. */}
              <Link
                to="/pay"
                className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['pay-btn']}`}
              >
                <Icon name="card" /> {t('dashboard:payNow')}
              </Link>
            </div>
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
        {/* FLAG: the two actions here have no destination yet (owner,
            2026-08-07: "nothing should happen on these buttons for now"),
            so they are rendered as inert text rather than as links that
            would go somewhere arbitrary. */}
        <WideCard
          tone="pos"
          icon="doc"
          title={t('dashboard:rulesTitle')}
          body={t('dashboard:rulesBody')}
          action={t('dashboard:rulesAction')}
          viewAll={t('dashboard:viewAll')}
          art={<RulesArt />}
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
          art={<ContactArt />}
        />
      </div>
    </div>
  )
}

// One debt line: tinted icon tile, label, amount. The amount's colour states
// what the number means — owed is red, settled is neutral, and a credit is
// green (utils/balance.js's convention, applied to display here).
function DebtRow({ icon, tone, label, value, symbol }) {
  const owed = value > 0
  const ahead = value < 0
  return (
    <li className={styles['debt-row']}>
      <span className={`${styles['debt-ic']} ${styles[tone]}`}>
        <Icon name={icon} />
      </span>
      <div className={styles['debt-body']}>
        <div className={styles['debt-label']}>{label}</div>
        <div
          // Also exposed as data, not only as colour: the state is then
          // assertable in a test and readable in devtools without decoding
          // a hashed class name.
          data-state={owed ? 'owed' : ahead ? 'ahead' : 'settled'}
          className={`${styles['debt-value']} ${owed ? styles.owed : ''} ${ahead ? styles.ahead : ''}`}
        >
          {fmtNum(value)}
          <span className={styles.cur}>{symbol}</span>
        </div>
      </div>
    </li>
  )
}

// Donut split by debt type. Drawn with stroke-dasharray on a single circle
// per segment rather than paths: no arc maths, and it degrades to a plain
// ring when there is nothing to show.
const R = 54
const C = 2 * Math.PI * R

function Donut({ segments, label }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let offset = 0
  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 140 140" className={styles['donut-svg']} aria-hidden="true">
        <circle cx="70" cy="70" r={R} className={styles['donut-track']} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * C
            const dash = (
              <circle
                key={s.key}
                cx="70"
                cy="70"
                r={R}
                className={styles['donut-seg']}
                stroke={s.color}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return dash
          })}
      </svg>
      <span className={styles['donut-label']}>{label}</span>
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
          {actionTo ? (
            <Link to={actionTo} className={`${buttonStyles.btn} ${buttonStyles['btn-soft']} ${buttonStyles['btn-sm']}`}>
              {action}
            </Link>
          ) : (
            <span className={`${buttonStyles.btn} ${buttonStyles['btn-soft']} ${buttonStyles['btn-sm']} ${styles.inert}`}>
              {action}
            </span>
          )}
        </div>
        <div className={styles['wide-art']} aria-hidden="true">{art}</div>
      </div>
    </Card>
  )
}

// Decorative art. Drawn here rather than shipped as image files: two flat
// shapes in the theme's own tokens, so they follow light/dark like
// everything else and cost no request.
function RulesArt() {
  return (
    <svg viewBox="0 0 200 140" className={styles.art}>
      <ellipse cx="100" cy="126" rx="72" ry="9" fill="var(--teal-soft)" />
      <rect x="58" y="22" width="84" height="98" rx="8" fill="var(--card)" stroke="var(--teal-line)" strokeWidth="2" />
      <rect x="72" y="40" width="42" height="5" rx="2.5" fill="var(--teal-line)" />
      <rect x="72" y="54" width="56" height="5" rx="2.5" fill="var(--fill-2)" />
      <rect x="72" y="68" width="50" height="5" rx="2.5" fill="var(--fill-2)" />
      <path d="M104 82h36v22c0 12-18 18-18 18s-18-6-18-18z" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" />
      <path d="m114 102 5.5 5.5L131 96" fill="none" stroke="var(--teal)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 108c-8-6-10-18-4-26 5 8 10 12 14 14-4 4-7 8-10 12z" fill="var(--teal-soft)" />
      <path d="M164 110c8-6 10-18 4-26-5 8-10 12-14 14 4 4 7 8 10 12z" fill="var(--teal-soft)" />
    </svg>
  )
}

function ContactArt() {
  return (
    <svg viewBox="0 0 200 140" className={styles.art}>
      <ellipse cx="100" cy="126" rx="72" ry="9" fill="var(--teal-soft)" />
      <path d="M56 92V74a44 44 0 0 1 88 0v18" fill="none" stroke="var(--teal)" strokeWidth="7" strokeLinecap="round" />
      <rect x="42" y="84" width="22" height="34" rx="10" fill="var(--teal)" />
      <rect x="136" y="84" width="22" height="34" rx="10" fill="var(--teal)" />
      <circle cx="118" cy="66" r="30" fill="var(--teal-soft)" stroke="var(--teal-line)" strokeWidth="2" />
      <circle cx="106" cy="66" r="3.6" fill="var(--teal)" />
      <circle cx="118" cy="66" r="3.6" fill="var(--teal)" />
      <circle cx="130" cy="66" r="3.6" fill="var(--teal)" />
      <path d="M100 92c0 6-4 12-10 15 9 1 16-3 20-9z" fill="var(--teal-soft)" stroke="var(--teal-line)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
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
