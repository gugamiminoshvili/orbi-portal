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
import cardStyles from '../../components/ui/Card.module.css'
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

// Shared by the USD-total conversion and the donut's common-currency
// proportions — both need the same USD/GEL number.
function usdGelRate(rates) {
  const row = rates?.rates?.find((r) => r.pair === 'USD/GEL')
  return row ? row.rate : null
}

export default function DashboardPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('common:home') }])

  const { data, loading } = useAsync(loadDashboard, [])

  // The heading renders unconditionally (mirrors NewsListPage) — only the
  // data-driven body swaps to a skeleton while loading.
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
  const rate = usdGelRate(rates)

  // "Debt" is what's actually owed — flatBalance.debt_sum, the negative-only
  // split — not maintenance.sum, which adaptCommunals documents as the
  // POSITIVE/credit-only split of the same per-apartment balances. Showing
  // the credit total on a card titled "Total debt" would misstate what the
  // owner owes.
  const maintenanceDebt = Math.abs(communals.maintenance.debtSum)
  // Utilities has no equivalent debt/credit split exposed by getCommunals()
  // — communal only carries electricityBalance_sum (itself a credit-only
  // figure per the same adapter comment) and internet_debt_sum. Both are
  // summed at face value as a single "Utilities" figure: P3-1 already
  // flagged this ambiguity and this task has no additional data to resolve
  // it with.
  const utilitiesTotal = communals.utilities.electricitySum + communals.utilities.internetSum

  // Currency-conditional, same pattern as payFlowData.owedFor: LIVE
  // maintenance arrives in USD (flatBalance.currency 'USD') and needs the
  // USD/GEL rate to combine with the GEL-denominated utilities figure; MOCK
  // maintenance is authored directly in GEL (mockCommunals sets currency
  // 'GEL' deliberately — see its comment) and must NOT be run through the
  // rate a second time, or the mock total double-converts. Whichever
  // currency maintenance is in, that's also the currency the combined total
  // is expressed in — there's no reason to force everything through USD when
  // the maintenance figure is already GEL.
  const maintenanceCurrency = communals.maintenance.currency || 'USD'
  const maintenanceSymbol = maintenanceCurrency === 'GEL' ? '₾' : '$'
  const isGelMaintenance = maintenanceCurrency === 'GEL'

  // Owner request (2026-07-21): do NOT merge the two currencies into one
  // converted total — maintenance ($ / native) stays on its own line above
  // utilities (₾), each in its native currency. The donut below still shows
  // the proportional split (which needs a common currency), but no single
  // merged debt figure is displayed.

  // Donut needs both slices in one currency. GEL maintenance already shares
  // utilities' currency, so no conversion/rate is needed at all; USD
  // maintenance still needs the rate to convert into GEL alongside
  // utilities, and hides when the rate is unavailable rather than falling
  // back to an equal-weight guess that would misrepresent the real split
  // (the two sum lines still render either way).
  const donutSegments = isGelMaintenance
    ? [
        { key: 'maintenance', value: maintenanceDebt, color: 'var(--teal)' },
        { key: 'utilities', value: utilitiesTotal, color: 'var(--info)' },
      ]
    : rate != null
      ? [
          { key: 'maintenance', value: maintenanceDebt * rate, color: 'var(--teal)' },
          { key: 'utilities', value: utilitiesTotal, color: 'var(--info)' },
        ]
      : null
  const hasDebt = maintenanceDebt > 0 || utilitiesTotal > 0

  return (
    <div>
      {head}

      <div className={styles['top-grid']}>
        <Card className={styles['debt-card']}>
          <Card.Head>
            <h3>{t('dashboard:totalDebtTitle')}</h3>
          </Card.Head>
          <Card.Pad>
            <div className={styles['debt-body']}>
              <div className={styles['debt-lines']}>
                <div className={styles['debt-row']}>
                  <span className={styles.dot} style={{ background: 'var(--teal)' }} />
                  <span className={styles.k}>{t('dashboard:maintenanceLabel')}</span>
                  <span className={styles.v}>{fmt(maintenanceDebt, maintenanceSymbol)}</span>
                </div>
                <div className={styles['debt-row']}>
                  <span className={styles.dot} style={{ background: 'var(--info)' }} />
                  <span className={styles.k}>{t('dashboard:utilitiesLabel')}</span>
                  <span className={styles.v}>{fmt(utilitiesTotal, '₾')}</span>
                </div>
              </div>
              {donutSegments && hasDebt && (
                <DonutChart
                  segments={donutSegments}
                  ariaLabel={t('dashboard:donutAria', {
                    maintenance: fmt(maintenanceDebt, maintenanceSymbol),
                    utilities: fmt(utilitiesTotal, '₾'),
                  })}
                />
              )}
            </div>
            <Link
              to="/pay"
              className={`${buttonStyles.btn} ${buttonStyles['btn-primary']}`}
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
            >
              <Icon name="wallet" /> {t('dashboard:payNow')}
            </Link>
          </Card.Pad>
        </Card>

        {rates && (
          <Card className={styles['rates-card']}>
            <Card.Head sub={t('dashboard:ratesSource', { source: rates.source })}>
              <h3>{t('dashboard:ratesTitle')}</h3>
            </Card.Head>
            <Card.Pad>
              {rates.rates.map((r) => {
                const up = r.delta >= 0
                return (
                  <div key={r.pair} className={styles['rate-row']}>
                    <span className={styles.k}>{r.pair}</span>
                    <span className={styles.v}>{r.rate.toFixed(4)}</span>
                    <span className={`${styles.delta} ${up ? styles.pos : styles.neg}`}>
                      {up ? '▲' : '▼'} {Math.abs(r.delta).toFixed(4)}
                    </span>
                  </div>
                )
              })}
            </Card.Pad>
          </Card>
        )}
      </div>

      <div className={styles['stats-grid']}>
        <StatTile icon="doc" title={t('dashboard:contractsTitle')}>
          {contracts.empty ? (
            <div className={styles['tile-empty']}>{t('dashboard:contractsEmpty')}</div>
          ) : (
            <div className={styles['tile-value']}>
              {t('dashboard:contractsCount', { count: contracts.deals.length })}
            </div>
          )}
        </StatTile>
        <StatTile icon="bolt" title={t('dashboard:utilitiesTileTitle')}>
          <div className={styles['tile-value']}>{fmt(utilitiesTotal, '₾')}</div>
        </StatTile>
        <StatTile icon="wrench" title={t('dashboard:maintenanceTileTitle')}>
          <div className={styles['tile-value']}>{fmt(maintenanceDebt, maintenanceSymbol)}</div>
        </StatTile>
        <StatTile icon="warn" title={t('dashboard:unpaidInvoicesTitle')}>
          <Badge tone={unpaid.count > 0 ? 'neg' : 'pos'}>
            {t('dashboard:unpaidInvoicesCount', { count: unpaid.count })}
          </Badge>
        </StatTile>
      </div>

      <div className={styles['soon-grid']}>
        <Card className={styles['soon-card']}>
          <div className={styles['soon-icon']}>
            <Icon name="tag" />
          </div>
          <div className={styles['soon-title']}>{t('dashboard:activeOffersTitle')}</div>
          <Badge tone="muted">{t('common:comingSoon')}</Badge>
        </Card>
        <Card className={styles['soon-card']}>
          <div className={styles['soon-icon']}>
            <Icon name="doc" />
          </div>
          <div className={styles['soon-title']}>{t('dashboard:additionalContractsTitle')}</div>
          <Badge tone="muted">{t('common:comingSoon')}</Badge>
        </Card>
      </div>

      <div className={styles['actions-grid']}>
        <Link to="/pay" className={`${cardStyles.card} ${styles['action-card']}`}>
          <div className={styles['action-icon']}>
            <Icon name="wallet" />
          </div>
          <div className={styles['action-body']}>
            <div className={styles['action-title']}>{t('dashboard:payNowAction')}</div>
            <div className={styles['action-sub']}>{t('dashboard:payNowActionSub')}</div>
          </div>
          <Icon name="arrow" className={styles['action-arrow']} />
        </Link>
        <Link to="/support/new" className={`${cardStyles.card} ${styles['action-card']}`}>
          <div className={styles['action-icon']}>
            <Icon name="wrench" />
          </div>
          <div className={styles['action-body']}>
            <div className={styles['action-title']}>{t('dashboard:requestMaintenanceAction')}</div>
            <div className={styles['action-sub']}>{t('dashboard:requestMaintenanceActionSub')}</div>
          </div>
          <Icon name="arrow" className={styles['action-arrow']} />
        </Link>
        <Link to="/support" className={`${cardStyles.card} ${styles['action-card']}`}>
          <div className={styles['action-icon']}>
            <Icon name="chat" />
          </div>
          <div className={styles['action-body']}>
            <div className={styles['action-title']}>{t('dashboard:contactSupportAction')}</div>
            <div className={styles['action-sub']}>{t('dashboard:contactSupportActionSub')}</div>
          </div>
          <Icon name="arrow" className={styles['action-arrow']} />
        </Link>
      </div>
    </div>
  )
}

function StatTile({ icon, title, children }) {
  return (
    <Card className={styles.tile}>
      <div className={styles['tile-icon']}>
        <Icon name={icon} />
      </div>
      <div className={styles['tile-body']}>
        <div className={styles['tile-label']}>{title}</div>
        {children}
      </div>
    </Card>
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
            <Skeleton h={44} r={11} />
          </div>
        </Card>
        <Card className={styles['rates-card']}>
          <div style={{ padding: 22 }}>
            <Skeleton h={16} w={140} style={{ marginBottom: 18 }} />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} h={14} style={{ marginBottom: 10 }} />
            ))}
          </div>
        </Card>
      </div>
      <div className={styles['stats-grid']}>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className={styles.tile}>
            <Skeleton w={40} h={40} r={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton h={11} w="60%" />
              <Skeleton h={16} w="40%" />
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
