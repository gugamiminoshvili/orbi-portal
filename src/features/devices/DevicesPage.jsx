import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrumbs } from '../../components/layout/AppShell'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { listDevices, removeDevice } from '../../api/endpoints/devices'
import { deviceStore } from '../../api/deviceStore'
import { fmtDate } from '../../utils/format'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton from '../../components/ui/Skeleton'
import modalStyles from '../../context/Modal.module.css'
import styles from './Devices.module.css'

// A phone gets a phone; anything registered from a browser gets a laptop,
// whatever OS it runs. The platform enum is the backend's own
// (utils/deviceInfo.js), so the map is keyed on those values verbatim.
const PLATFORM_ICON = {
  ios: 'mobile',
  ipados: 'mobile',
  android: 'mobile',
  Android: 'mobile',
  macOS: 'laptop',
  Windows: 'laptop',
  Win10: 'laptop',
  Linux: 'laptop',
}

export default function DevicesPage() {
  const { t } = useTranslation()
  useCrumbs([{ label: t('devices:title') }])

  const { data, loading, reload } = useAsync(listDevices, [])
  const { openModal, closeModal } = useModal()
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const currentUuid = deviceStore.getDeviceUuid()

  const confirmRemove = useCallback(
    (device) => {
      openModal(
        <RemoveDialog
          device={device}
          isCurrent={device.uuid === currentUuid}
          onCancel={closeModal}
          onConfirm={async () => {
            closeModal()
            setBusy(device.uuid)
            try {
              await removeDevice(device.uuid)
              // Forgetting THIS browser has to clear the local uuid too,
              // or the next sign-in would send an id the backend no longer
              // knows and the skip would fail silently.
              if (device.uuid === currentUuid) deviceStore.clear()
              toast(t('devices:removed'))
              reload()
            } catch {
              toast(t('devices:removeFailed'))
            } finally {
              setBusy(null)
            }
          }}
        />,
        { size: '' }
      )
    },
    [openModal, closeModal, currentUuid, reload, toast, t]
  )

  const head = (
    <div className={styles.head}>
      <h1>{t('devices:title')}</h1>
      <p>{t('devices:subtitle')}</p>
    </div>
  )

  if (loading) {
    return (
      <div>
        {head}
        <Card>
          <div style={{ padding: 22 }}>
            <Skeleton h={72} r={12} />
          </div>
        </Card>
      </div>
    )
  }

  const devices = data || []

  return (
    <div>
      {head}

      {devices.length === 0 ? (
        <Card>
          <EmptyState icon="mobile" title={t('devices:emptyTitle')}>
            <p>{t('devices:emptyBody')}</p>
          </EmptyState>
        </Card>
      ) : (
        <ul className={styles.list}>
          {devices.map((d) => {
            const isCurrent = d.uuid === currentUuid
            return (
              <li key={d.uuid}>
                <Card className={styles.row} data-device={d.uuid}>
                  <span className={`${styles.ic} ${isCurrent ? styles.now : ''}`}>
                    <Icon name={PLATFORM_ICON[d.platform] || 'laptop'} />
                  </span>

                  <div className={styles.body}>
                    <div className={styles.name}>
                      {d.name || d.model || t('devices:unnamed')}
                      {isCurrent && (
                        <Badge tone="pos" className={styles.tag}>
                          {t('devices:thisDevice')}
                        </Badge>
                      )}
                      {!d.verified && (
                        <Badge tone="warn" className={styles.tag}>
                          {t('devices:unverified')}
                        </Badge>
                      )}
                    </div>
                    <div className={styles.meta}>
                      {[
                        d.platform,
                        // 'web' is not a manufacturer anyone needs to read;
                        // it is what this portal sends for its own rows.
                        d.manufacturer && d.manufacturer !== 'web' ? d.manufacturer : null,
                        d.model && d.model !== d.name ? d.model : null,
                        d.registeredAt
                          ? t('devices:added', { date: fmtDate(d.registeredAt) })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.remove}
                    disabled={busy === d.uuid}
                    onClick={() => confirmRemove(d)}
                  >
                    <Icon name="trash" /> {t('devices:remove')}
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.note}>
        <Icon name="info" />
        <span>{t('devices:note')}</span>
      </div>
    </div>
  )
}

// Removing a device is not undoable from here — the only way back is to sign
// in from it again and pass verification — so it asks first, and says what
// happens rather than "are you sure?".
function RemoveDialog({ device, isCurrent, onCancel, onConfirm }) {
  const { t } = useTranslation()
  return (
    <>
      <div className={modalStyles['modal-head']}>
        <h3>{t('devices:removeTitle')}</h3>
      </div>
      <div className={modalStyles['modal-body']}>
        <p className={styles['dlg-name']}>{device.name || device.model}</p>
        <p className={styles['dlg-body']}>
          {isCurrent ? t('devices:removeCurrentBody') : t('devices:removeBody')}
        </p>
      </div>
      <div className={modalStyles['modal-foot']}>
        <Button variant="ghost" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          <Icon name="trash" /> {t('devices:remove')}
        </Button>
      </div>
    </>
  )
}
