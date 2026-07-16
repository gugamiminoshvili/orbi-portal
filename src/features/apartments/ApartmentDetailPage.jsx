import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import { getApartment } from '../../api/endpoints/apartments'
import { blockGrad, ROLE_STYLE } from '../../api/mock/apartments'
import { qrSvg } from '../../utils/placeholder'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Skeleton from '../../components/ui/Skeleton'
import CopyButton from '../../components/ui/CopyButton'
import buttonStyles from '../../components/ui/Button.module.css'
import MaintenanceCard from './services/MaintenanceCard'
import WaterCard from './services/WaterCard'
import ElectricityCard from './services/ElectricityCard'
import InternetCard from './services/InternetCard'
import DoorsCard from './services/DoorsCard'
import styles from './Detail.module.css'

// Mirrors the `aptDetail` route (reference/orbi-portal-redesign.html lines
// 1264-1338): header, apartment-information card with QR corner, and the
// five service accordions.
export default function ApartmentDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const toast = useToast()

  const { data: apt, loading, reload } = useAsync(() => getApartment(id), [id])

  // getApartment() resolves undefined for unknown ids — treat that as
  // not-found instead of leaving the skeleton up forever (mirrors NewsDetailPage).
  const notFound = !loading && !apt

  useCrumbs(
    apt
      ? [
          { label: t('common:home'), to: '/' },
          { label: t('common:myApartments'), to: '/apartments' },
          { label: apt.code },
        ]
      : [{ label: t('common:home'), to: '/' }, { label: t('common:myApartments'), to: '/apartments' }]
  )

  const backLink = (
    <Link to="/apartments" className={`${buttonStyles.btn} ${buttonStyles['btn-ghost']} ${buttonStyles['btn-sm']}`} style={{ marginBottom: 18 }}>
      <Icon name="back" /> {t('apartments:allApartments')}
    </Link>
  )

  if (notFound) {
    return (
      <div>
        {backLink}
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
        {backLink}
        <AptDetailSkeleton />
      </div>
    )
  }

  const rs = ROLE_STYLE[apt.role] || ROLE_STYLE.Owner
  const meta = [
    { label: t('apartments:object'), value: apt.project },
    { label: t('apartments:block'), value: apt.block },
    { label: t('apartments:square'), value: `${apt.area} m²` },
    { label: t('apartments:floor'), value: apt.floor },
    { label: t('apartments:number'), value: apt.number },
    { label: t('apartments:cadastralNumber'), value: apt.cadastral, copy: true },
    { label: t('apartments:waterCode'), value: apt.waterCode },
    { label: t('apartments:apCode'), value: apt.apCode },
  ]

  return (
    <div>
      {backLink}

      <div className={styles.head}>
        <div className={styles['head-icon']} style={{ background: blockGrad(apt) }}>
          <Icon name="building" size={26} />
        </div>
        <div>
          <h1 className={styles['head-title']}>
            {apt.code}
            <Badge dot style={{ background: rs.bg, color: rs.col }}>
              {t(`apartments:roles.${apt.role}`, apt.role)}
            </Badge>
          </h1>
          <p className={styles['head-sub']}>
            <Icon name="pin" /> {t('apartments:aptSubtitle', { building: apt.building, number: apt.number })}
          </p>
        </div>
      </div>

      <Card style={{ marginBottom: 8 }}>
        <div className={styles['ov-head']}>
          <h3>{t('apartments:infoTitle')}</h3>
          <Button onClick={() => toast(t('apartments:bookingToast'))}>
            <Icon name="cal" /> {t('apartments:book')}
          </Button>
        </div>
        <div className={styles['ov-body']}>
          <div className={styles.meta}>
            <div className={styles['ov-meta']}>
              {meta.map((m) => (
                <div className={styles.cell} key={m.label}>
                  <div className={styles.k}>{m.label}</div>
                  <div className={styles.v}>
                    {m.copy ? (
                      <span className={styles.copywrap}>
                        {m.value}
                        <CopyButton value={m.value} ariaLabel={t('apartments:copyCadastralAria')} />
                      </span>
                    ) : (
                      m.value
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles['qr-corner']}>
            <div
              className={styles.qr}
              role="button"
              tabIndex={0}
              aria-label={t('apartments:enlargeQrAria')}
              onClick={() => toast(t('apartments:qrToast'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') toast(t('apartments:qrToast'))
              }}
              dangerouslySetInnerHTML={{ __html: qrSvg(apt.apCode) }}
            />
            <div className={styles.ql}>{t('apartments:qrLabel')}</div>
            <Button variant="ghost" size="sm" style={{ marginTop: 8, width: '100%' }} onClick={() => toast(t('apartments:qrToast'))}>
              <Icon name="expand" /> {t('apartments:show')}
            </Button>
          </div>
        </div>
      </Card>

      <div className={styles['section-label']}>{t('apartments:services')}</div>
      <MaintenanceCard apt={apt} />
      <WaterCard apt={apt} />
      <ElectricityCard apt={apt} />
      <InternetCard apt={apt} onReload={reload} />
      <DoorsCard apt={apt} />
    </div>
  )
}

// Mirrors skAptDetail() at reference lines 1274-1285 — header + info card +
// 5 service-card skeletons.
function AptDetailSkeleton() {
  return (
    <div>
      <div className={styles.head}>
        <Skeleton w={74} h={74} r={16} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton h={24} w={220} />
          <Skeleton h={14} w={300} />
        </div>
      </div>
      <Card style={{ marginBottom: 22 }}>
        <div className={styles['ov-head']}>
          <Skeleton h={16} w={180} />
          <Skeleton h={38} w={110} r={10} />
        </div>
        <div className={styles['ov-body']}>
          <div className={styles.meta}>
            <div className={styles['ov-meta']}>
              {Array.from({ length: 8 }, (_, i) => (
                <div className={styles.cell} key={i}>
                  <Skeleton h={11} w="55%" style={{ marginBottom: 6 }} />
                  <Skeleton h={14} w="80%" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton w={108} h={108} r={12} />
        </div>
      </Card>
      <Skeleton h={16} w={120} style={{ margin: '26px 0 14px' }} />
      {Array.from({ length: 5 }, (_, i) => (
        <Card key={i} style={{ marginBottom: 14 }}>
          <div className={styles['svc-head']} style={{ cursor: 'default' }}>
            <Skeleton w={44} h={44} r={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton h={15} w={160} />
              <Skeleton h={12} w={100} />
            </div>
            <Skeleton h={14} w={70} />
          </div>
        </Card>
      ))}
    </div>
  )
}
