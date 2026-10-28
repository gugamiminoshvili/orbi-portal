import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { getCommunals, getRates } from '../../api/endpoints/dashboard'
import { listApartments } from '../../api/endpoints/apartments'
import { buildRows, buildComplexes, hasApCode, owedFor, round2 } from './payFlowData'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import ComplexStep from './ComplexStep'
import UtilityStep from './UtilityStep'
import ApartmentsStep from './ApartmentsStep'
import { UTILITY_ICON } from './utilityIcons'
import Icon from '../../components/ui/Icon'
import styles from './PayFlow.module.css'

// Replaces the v1 single-apartment PayPage (Task P3-3 — see design doc
// docs/specs/2026-07-17-dashboard-multipay-design.md) with a 3-step flow:
// complex -> utility -> apartment checkbox table + summary. State lives here
// (step/complex/utility/selections) rather than in the URL — Back buttons
// just walk the local `step` state back down, matching the brief ("no URL
// params needed v1").
async function loadFlowData() {
  const [communals, apartments, rates] = await Promise.all([getCommunals(), listApartments(), getRates()])
  return { communals, apartments, rates }
}

function usdGelRate(rates) {
  const row = rates?.rates?.find((r) => r.pair === 'USD/GEL')
  return row ? row.rate : null
}

export default function MultiPayFlow() {
  const { t } = useTranslation()
  const location = useLocation()
  useCrumbs([{ label: t('common:home'), to: '/' }, { label: t('common:pay') }])

  const { data, loading } = useAsync(loadFlowData, [])

  const [step, setStep] = useState(1)
  const [complexProject, setComplexProject] = useState(null)
  const [utility, setUtility] = useState(null)
  const [selections, setSelections] = useState({})
  const [preselectApplied, setPreselectApplied] = useState(false)

  const rows = useMemo(() => (data ? buildRows(data.communals.byApartment, data.apartments) : []), [data])
  const usdRate = data ? usdGelRate(data.rates) : null
  // Which currency the maintenance balances arrive in — 'USD' live, 'GEL' in
  // mock mode (mockCommunals). owedFor only converts by the USD/GEL rate
  // when this is 'USD'; see payFlowData.js's owedFor comment.
  const maintenanceCurrency = data?.communals.maintenance.currency ?? 'USD'
  const complexes = useMemo(
    () => buildComplexes(rows, usdRate, maintenanceCurrency),
    [rows, usdRate, maintenanceCurrency]
  )

  // Deep-link preselect: service Pay buttons (MaintenanceCard/
  // ElectricityCard/InternetCard) and the /pay/:id redirect (PayRedirect)
  // both forward `{apartmentCode, utility}` as router state. Once the flow
  // data has loaded, jump straight to step 3 with that apartment's complex +
  // utility preset, pre-checking the row itself only when it's actually
  // owed for that utility. Deliberately NOT defaultSelections(): the user
  // pressed Pay on ONE apartment, so checking the complex's other debtors
  // for them would quietly inflate what they're about to pay. Runs once per
  // mount (preselectApplied), not on every data refetch/back-navigation.
  useEffect(() => {
    if (preselectApplied || !data || !location.state?.apartmentCode) return
    const { apartmentCode, utility: preUtility } = location.state
    const row = rows.find((r) => r.code === apartmentCode)
    if (row) {
      setComplexProject(row.project)
      if (preUtility) {
        setUtility(preUtility)
        const owed = owedFor(row, preUtility, usdRate, maintenanceCurrency)
        if (owed > 0 && hasApCode(row)) setSelections({ [row.code]: round2(owed) })
        setStep(3)
      } else {
        setStep(2)
      }
    }
    setPreselectApplied(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, preselectApplied])

  // Each step has its own title and line; steps 2-3 also show the trail of
  // what was picked - each crumb steps back to that choice.
  const STEP_COPY = {
    1: ['pay:step1Title', 'pay:step1Sub'],
    2: ['pay:step2Title', 'pay:step2Sub'],
    3: ['pay:step3Title', 'pay:step3Sub'],
  }
  const trailComplex = complexes.find((c) => c.project === complexProject)
  const head = (
    <div className={styles['page-head']}>
      <div>
        <h1>{t(STEP_COPY[step][0])}</h1>
        <p>{t(STEP_COPY[step][1])}</p>
        {step >= 2 && trailComplex && (
          <nav className={styles.trail} aria-label={t('pay:trailAria')}>
            <button type="button" className={styles.tchip} onClick={() => setStep(1)}>
              <Icon name="building" size={14} /> {trailComplex.project}
            </button>
            {step === 3 && utility && (
              <>
                <span className={styles.tsep} aria-hidden="true">/</span>
                <button
                  type="button"
                  className={styles.tchip}
                  style={{ background: UTILITY_ICON[utility].bg, color: UTILITY_ICON[utility].color }}
                  onClick={() => setStep(2)}
                >
                  <Icon name={UTILITY_ICON[utility].icon} size={14} /> {t(`pay:utilityLabels.${utility}`)}
                </button>
              </>
            )}
          </nav>
        )}
      </div>
    </div>
  )

  if (loading || !data) {
    return (
      <div>
        {head}
        <Card>
          <div style={{ padding: 22 }}>
            <Skeleton h={14} style={{ marginBottom: 10 }} />
            <Skeleton h={14} style={{ marginBottom: 10 }} />
            <Skeleton h={14} w="60%" />
          </div>
        </Card>
      </div>
    )
  }

  const activeComplex = complexes.find((c) => c.project === complexProject)

  function goToUtilityStep(project) {
    setComplexProject(project)
    setStep(2)
  }
  // Entering step 3 pre-checks every apartment that actually owes something
  // for this utility, at its full outstanding amount (owner call 2026-08-06)
  // — clearing a row is one click, and the common case is "pay what's due".
  // Rows with nothing outstanding stay unchecked: they can still be paid into
  // as an advance, but only deliberately.
  function defaultSelections(apartments, u) {
    const next = {}
    for (const row of apartments) {
      const owed = owedFor(row, u, usdRate, maintenanceCurrency)
      if (owed > 0 && hasApCode(row)) next[row.code] = round2(owed)
    }
    return next
  }

  function goToApartmentsStep(u) {
    setUtility(u)
    setSelections(defaultSelections(activeComplex.apartments, u))
    setStep(3)
  }

  return (
    <div>
      {head}
      {step === 1 && <ComplexStep complexes={complexes} onSelect={goToUtilityStep} />}
      {step === 2 && activeComplex && (
        <UtilityStep
          complex={activeComplex}
          usdRate={usdRate}
          maintenanceCurrency={maintenanceCurrency}
          onSelect={goToApartmentsStep}
        />
      )}
      {step === 3 && activeComplex && utility && (
        <ApartmentsStep
          complex={activeComplex}
          utility={utility}
          usdRate={usdRate}
          maintenanceCurrency={maintenanceCurrency}
          selections={selections}
          onSelectionsChange={setSelections}
        />
      )}
    </div>
  )
}
