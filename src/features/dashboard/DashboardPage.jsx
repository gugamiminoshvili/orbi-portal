import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { getCommunals, getRates, getContractsSummary, getUnpaidInvoices } from '../../api/endpoints/dashboard'
import { fmt } from '../../utils/format'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import buttonStyles from '../../components/ui/Button.module.css'
import DonutChart from './DonutChart'
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

// Shared by the donut's common-currency proportions — the USD/GEL number.
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
      <div>
        <h1>{t('dashboard:title')}</h1>
        <p>{t('dashboard:subtitle')}</p>
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
  // maintenance arrives in USD, MOCK in GEL. We never DISPLAY a merged
  // cross-currency total (owner request 2026-07-21) — each balance stays in
  // its native currency. The rate is only used internally, to size the donut
  // slices in one common currency.
  const maintenanceCurrency = communals.maintenance.currency || 'USD'
  const maintenanceSymbol = maintenanceCurrency === 'GEL' ? '₾' : '$'
  const isGelMaintenance = maintenanceCurrency === 'GEL'
  const rate = usdGelRate(rates)

  // Both slices in one currency (GEL) for the ring proportions only.
  const maintenanceGel = isGelMaintenance ? maintenanceDebt : rate != null ? maintenanceDebt * rate : null
  const donutSegments =
    maintenanceGel != null
      ? [
          { key: 'maintenance', value: maintenanceGel, color: 'var(--violet)' },
          { key: 'utilities', value: utilitiesTotal, color: 'var(--neg)' },
        ]
      : null
  const proportionTotal = maintenanceGel != null ? maintenanceGel + utilitiesTotal : 0
  const maintenancePct = proportionTotal > 0 ? Math.round((maintenanceGel / proportionTotal) * 100) : 0
  const hasDebt = maintenanceDebt > 0 || utilitiesTotal > 0

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
              {donutSegments && hasDebt && (
                <DonutChart
                  segments={donutSegments}
                  size={132}
                  strokeWidth={18}
                  ariaLabel={t('dashboard:donutAria', {
                    maintenance: fmt(maintenanceDebt, maintenanceSymbol),
                    utilities: fmt(utilitiesTotal, '₾'),
                  })}
                  center={
                    <>
                      <span className={styles['donut-pct']}>{maintenancePct}%</span>
                      <span className={styles['donut-cap']}>{t('dashboard:maintenanceLabel')}</span>
                    </>
                  }
                />
              )}
              <ul className={styles['debt-lines']}>
                <li className={styles['debt-row']}>
                  <span className={styles.dot} style={{ background: 'var(--violet)' }} />
                  <span className={styles.k}>{t('dashboard:maintenanceLabel')}</span>
                  <span className={styles.v}>{fmt(maintenanceDebt, maintenanceSymbol)}</span>
                </li>
                <li className={styles['debt-row']}>
                  <span className={styles.dot} style={{ background: 'var(--neg)' }} />
                  <span className={styles.k}>{t('dashboard:utilitiesLabel')}</span>
                  <span className={styles.v}>{fmt(utilitiesTotal, '₾')}</span>
                </li>
                <li className={`${styles['debt-row']} ${styles.muted}`}>
                  <span className={styles.dot} style={{ background: 'var(--muted)' }} />
                  <span className={styles.k}>{t('dashboard:otherChargesLabel')}</span>
                  <span className={styles.v}>{fmt(0, '₾')}</span>
                </li>
              </ul>
            </div>
            <Link
              to="/pay"
              className={`${buttonStyles.btn} ${buttonStyles['btn-primary']} ${styles['pay-btn']}`}
            >
              <Icon name="wallet" /> {t('dashboard:payNow')}
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
