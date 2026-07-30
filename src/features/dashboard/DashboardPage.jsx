import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { getCommunals, getRates, getContractsSummary, getUnpaidInvoices } from '../../api/endpoints/dashboard'
import { fmt, fmtNum } from '../../utils/format'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import styles from './Dashboard.module.css'

// One combined fetch (rather than 4 separate useAsync calls) so the whole
// page shows a single skeleton rather than 4 tiles popping in independently
// as each request resolves at its own mock-latency roll.
async function loadDashboard() {
  const [communals, rates, contracts, unpaid] = await Promise.all([
    getCommunals(),
    getRates(),
    getContractsSummary(),
    getUnpaidInvoices(),
  ])
  return { communals, rates, contracts, unpaid }
}

export default function DashboardPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home') }])

  const { data, loading } = useAsync(loadDashboard, [])

  const head = (
    <div className={styles['page-head']}>
      <div>
        <h1>{t('dashboard:title')}</h1>
      </div>
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

  const { communals, rates, contracts, unpaid } = data

  // "Debt" is what's actually owed — flatBalance.debt_sum, the negative-only
  // split — not maintenance.sum, which adaptCommunals documents as the
  // POSITIVE/credit-only split of the same per-apartment balances.
  const maintenanceDebt = Math.abs(communals.maintenance.debtSum)
  const utilitiesTotal = communals.utilities.electricitySum + communals.utilities.internetSum

  // Currency-conditional (same pattern as payFlowData.owedFor): LIVE
  // maintenance arrives in USD, MOCK in GEL. Nothing on this card merges the
  // two currencies (owner request 2026-07-21, reaffirmed 2026-07-30) — no
  // summed figure, and no chart either: a donut states "one whole split into
  // parts", which two unrelated currencies are not. Each currency gets its
  // own headline figure, and the legend on the right names the lines.
  const maintenanceCurrency = communals.maintenance.currency || 'USD'
  const maintenanceSymbol = maintenanceCurrency === 'GEL' ? '₾' : '$'

  // No backend source for "other charges" yet — kept as an explicit 0 rather
  // than a hardcoded literal in the JSX so the GEL headline stays correct
  // the day it IS wired up.
  const otherCharges = 0
  const gelTotal = utilitiesTotal + otherCharges

  return (
    <div>
      {head}

      <div className={styles['top-grid']}>
        <Card className={styles['debt-card']}>
          <Card.Head>
            <div className={styles['head-titles']}>
              <h3>{t('dashboard:totalDebtTitle')}</h3>
              <span className={styles['head-sub']}>{t('dashboard:totalDebtSubtitle')}</span>
            </div>
            {unpaid.count > 0 && (
              <Badge tone="neg">{t('dashboard:unpaidInvoicesCount', { count: unpaid.count })}</Badge>
            )}
          </Card.Head>
          <Card.Pad>
            <div className={styles['debt-body']}>
              <div className={styles['debt-totals']}>
                <Amount
                  value={maintenanceDebt}
                  symbol={maintenanceSymbol}
                  label={t('dashboard:maintenanceLabel')}
                />
                <Amount value={gelTotal} symbol="₾" label={t('dashboard:utilitiesLabel')} />
                <Link
                  to="/pay"
                  className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['pay-btn']}`}
                >
                  <Icon name="wallet" /> {t('dashboard:payNow')}
                </Link>
              </div>
              <ul className={styles['debt-lines']}>
                <DebtRow
                  color="var(--violet)"
                  label={t('dashboard:maintenanceLabel')}
                  value={maintenanceDebt}
                  symbol={maintenanceSymbol}
                />
                <DebtRow
                  color="var(--neg)"
                  label={t('dashboard:utilitiesLabel')}
                  value={utilitiesTotal}
                  symbol="₾"
                />
                <DebtRow
                  color="var(--line-2)"
                  label={t('dashboard:otherChargesLabel')}
                  value={otherCharges}
                  symbol="₾"
                  muted
                />
              </ul>
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
            <Card.Pad>
              <div className={styles['rate-list']}>
                {rates.rates.map((r) => {
                  const up = r.delta >= 0
                  return (
                    <div key={r.pair} className={styles['rate-row']}>
                      <span className={styles.k}>{r.pair.replace('/', ' / ')}</span>
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

      <div className={styles['stats-grid']}>
        <StatCard icon="doc" tone="violet" title={t('dashboard:contractsTitle')}>
          {contracts.empty ? (
            <div className={styles['stat-empty']}>{t('dashboard:contractsEmpty')}</div>
          ) : (
            <div className={styles['stat-value']}>
              {t('dashboard:contractsCount', { count: contracts.deals.length })}
            </div>
          )}
        </StatCard>
        <StatCard
          icon="bolt"
          tone="warn"
          title={t('dashboard:utilitiesTileTitle')}
          to="/pay"
          sub={t('dashboard:utilitiesSub')}
        >
          <div className={styles['stat-value']}>{fmt(utilitiesTotal, '₾')}</div>
        </StatCard>
        <StatCard
          icon="wrench"
          tone="info"
          title={t('dashboard:maintenanceTileTitle')}
          to="/pay"
          sub={t('dashboard:maintenanceSub')}
        >
          <div className={`${styles['stat-value']} ${styles.owed}`}>{fmt(maintenanceDebt, maintenanceSymbol)}</div>
        </StatCard>
      </div>

      <div className={styles['soon-grid']}>
        <Card className={styles['soon-card']}>
          <div className={styles['soon-head']}>
            <span className={styles['soon-titlewrap']}>
              <span className={`${styles['soon-icon']} ${styles.violet}`}>
                <Icon name="tag" />
              </span>
              <h3>{t('dashboard:activeOffersTitle')}</h3>
            </span>
            <Badge tone="muted">{t('common:comingSoon')}</Badge>
          </div>
          <div className={styles['offer-sample']}>
            <span className={styles['offer-badge']}>%</span>
            <div>
              <div className={styles['offer-title']}>{t('dashboard:offerSampleTitle')}</div>
              <div className={styles['offer-body']}>{t('dashboard:offerSampleBody')}</div>
            </div>
          </div>
        </Card>

        <Card className={styles['soon-card']}>
          <div className={styles['soon-head']}>
            <span className={styles['soon-titlewrap']}>
              <span className={`${styles['soon-icon']} ${styles.slate}`}>
                <Icon name="doc" />
              </span>
              <h3>{t('dashboard:additionalContractsTitle')}</h3>
            </span>
            <Badge tone="muted">{t('common:comingSoon')}</Badge>
          </div>
          <div className={styles['addl-list']}>
            <div className={styles['addl-row']}>
              <span className={styles['addl-mark']}>P</span>
              <div className={styles['addl-body']}>
                <div className={styles['addl-title']}>{t('dashboard:addlParkingTitle')}</div>
                <div className={styles['addl-sub']}>{t('dashboard:addlParkingSub')}</div>
              </div>
            </div>
            <div className={styles['addl-row']}>
              <span className={styles['addl-mark']}>
                <Icon name="empty" />
              </span>
              <div className={styles['addl-body']}>
                <div className={styles['addl-title']}>{t('dashboard:addlStorageTitle')}</div>
                <div className={styles['addl-sub']}>{t('dashboard:addlStorageSub')}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className={styles['actions-grid']}>
        <ActionCard
          to="/pay"
          tone="pos"
          icon="wallet"
          title={t('dashboard:payNowAction')}
          sub={t('dashboard:payNowActionSub')}
        />
        <ActionCard
          to="/support/new"
          tone="warn"
          icon="wrench"
          title={t('dashboard:requestMaintenanceAction')}
          sub={t('dashboard:requestMaintenanceActionSub')}
        />
        <ActionCard
          to="/support"
          tone="info"
          icon="chat"
          title={t('dashboard:contactSupportAction')}
          sub={t('dashboard:contactSupportActionSub')}
        />
      </div>
    </div>
  )
}

// A headline balance: big grouped number with the currency symbol as its own
// smaller element. The label is carried by a screen-reader-only string rather
// than aria-label (which a generic <div> can't be named by) — visually the
// legend beside it names the two figures, but a bare "637.12" read on its own
// tells a screen-reader user nothing about WHICH balance it is.
function Amount({ value, symbol, label }) {
  return (
    <div className={styles.big}>
      <span className="sr-only">{`${label}: ${fmt(value, symbol)}`}</span>
      <span aria-hidden="true">
        {fmtNum(value)}
        <span className={styles.cur}>{symbol}</span>
      </span>
    </div>
  )
}

function DebtRow({ color, label, value, symbol, muted }) {
  return (
    <li className={`${styles['debt-row']} ${muted ? styles.muted : ''}`}>
      <span className={styles.dot} style={{ background: color }} />
      <span className={styles.k}>{label}</span>
      <span className={styles.v}>
        {fmtNum(value)}
        <span className={styles.cur}>{symbol}</span>
      </span>
    </li>
  )
}

function StatCard({ icon, tone, title, sub, to, children }) {
  const inner = (
    <>
      <span className={`${styles['stat-icon']} ${styles[tone]}`}>
        <Icon name={icon} />
      </span>
      <div className={styles['stat-body']}>
        <div className={styles['stat-label']}>{title}</div>
        {children}
        {sub && <div className={styles['stat-sub']}>{sub}</div>}
      </div>
      {to && <Icon name="arrow" className={styles['stat-arrow']} />}
    </>
  )
  return to ? (
    <Card className={`${styles['stat-card']} ${styles.linkable}`}>
      <Link to={to} className={styles['stat-hit']} aria-label={title}>
        {inner}
      </Link>
    </Card>
  ) : (
    <Card className={styles['stat-card']}>{inner}</Card>
  )
}

function ActionCard({ to, tone, icon, title, sub }) {
  return (
    <Link to={to} className={`${styles['action-card']} ${styles[tone]}`}>
      <span className={styles['action-icon']}>
        <Icon name={icon} />
      </span>
      <div className={styles['action-body']}>
        <div className={styles['action-title']}>{title}</div>
        <div className={styles['action-sub']}>{sub}</div>
      </div>
      <Icon name="arrow" className={styles['action-arrow']} />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className={styles['top-grid']}>
        <Card className={styles['debt-card']}>
          <div style={{ padding: 22 }}>
            <Skeleton h={16} w={140} style={{ marginBottom: 18 }} />
            <Skeleton h={14} style={{ marginBottom: 10 }} />
            <Skeleton h={14} style={{ marginBottom: 10 }} />
            <Skeleton h={14} w="60%" style={{ marginBottom: 18 }} />
            <Skeleton h={46} r={12} />
          </div>
        </Card>
        <Card className={styles['rates-card']}>
          <div style={{ padding: 22 }}>
            <Skeleton h={16} w={140} style={{ marginBottom: 18 }} />
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} h={14} style={{ marginBottom: 10 }} />
            ))}
          </div>
        </Card>
      </div>
      <div className={styles['stats-grid']}>
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className={styles['stat-card']}>
            <Skeleton w={44} h={44} r={13} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton h={11} w="55%" />
              <Skeleton h={18} w="40%" />
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
