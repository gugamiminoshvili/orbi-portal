import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { AppRoutes } from '../../routes'
import { adaptDevices } from '../../api/adapters/devices'
import { deviceStore } from '../../api/deviceStore'

vi.mock('../../api/endpoints/devices', () => ({
  listDevices: vi.fn(),
  removeDevice: vi.fn(),
}))

import { listDevices, removeDevice } from '../../api/endpoints/devices'

const DEVICES = [
  {
    uuid: 'this-one',
    name: 'Chrome Web Portal',
    manufacturer: 'web',
    model: 'Chrome',
    platform: 'macOS',
    registeredAt: '2026-08-21 09:14:02',
    verified: true,
  },
  {
    uuid: 'phone',
    name: 'iPhone 15 Pro',
    manufacturer: 'Apple',
    model: 'iPhone15,2',
    platform: 'ios',
    registeredAt: '2026-07-03 18:47:31',
    verified: true,
  },
  {
    uuid: 'never-confirmed',
    name: 'Firefox Web Portal',
    manufacturer: 'web',
    model: 'Firefox',
    platform: 'Windows',
    registeredAt: '2026-09-02 20:35:10',
    verified: false,
  },
]

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/devices']}>
      <ToastProvider>
        <ModalProvider>
          <AppRoutes />
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

const rowFor = (name) => screen.getByText(name).closest('[data-device]')

beforeEach(() => {
  localStorage.clear()
  listDevices.mockReset().mockResolvedValue(DEVICES)
  removeDevice.mockReset().mockResolvedValue({ ok: true })
})

describe('adaptDevices', () => {
  // The payload nests the device inside a join row and repeats the customer
  // link at the top; nothing in the UI has a use for either.
  test('flattens the join row and reads the join row’s own verified flag', () => {
    const [d] = adaptDevices([
      {
        id: 9,
        customer: 4,
        verified: true,
        device: {
          id: 3,
          device: 'Chrome Web Portal',
          device_uuid: 'abc',
          inserted_at: '2026-08-21 09:14:02',
          manufacturer: 'web',
          model: 'Chrome',
          platform: 'macOS',
        },
      },
    ])
    expect(d).toEqual({
      uuid: 'abc',
      name: 'Chrome Web Portal',
      manufacturer: 'web',
      model: 'Chrome',
      platform: 'macOS',
      registeredAt: '2026-08-21 09:14:02',
      verified: true,
    })
  })

  test('drops a device with no uuid — it could be neither named nor removed', () => {
    expect(adaptDevices([{ device: { device: 'Ghost' } }])).toEqual([])
    expect(adaptDevices(null)).toEqual([])
  })
})

describe('DevicesPage', () => {
  test('lists every device with its platform and the date it was added', async () => {
    renderApp()
    expect(await screen.findByText('iPhone 15 Pro')).toBeInTheDocument()

    expect(within(rowFor('iPhone 15 Pro')).getByText(/Apple/)).toHaveTextContent(
      'ios · Apple · iPhone15,2 · Added 2026-07-03'
    )
    // 'web' is what this portal sends as its own manufacturer — a label with
    // nothing in it for the reader.
    expect(within(rowFor('Chrome Web Portal')).getByText(/macOS/)).not.toHaveTextContent('web')
  })

  test('an unconfirmed device is called out; a confirmed one carries no badge', async () => {
    renderApp()
    await screen.findByText('Firefox Web Portal')

    expect(within(rowFor('Firefox Web Portal')).getByText('Not confirmed')).toBeInTheDocument()
    expect(within(rowFor('iPhone 15 Pro')).queryByText('Not confirmed')).not.toBeInTheDocument()
  })

  test('the browser being read right now is marked, and only that one', async () => {
    deviceStore.setDeviceUuid('this-one')
    renderApp()
    await screen.findByText('Chrome Web Portal')

    expect(within(rowFor('Chrome Web Portal')).getByText('This device')).toBeInTheDocument()
    expect(within(rowFor('iPhone 15 Pro')).queryByText('This device')).not.toBeInTheDocument()
  })

  test('removal asks first, and says what happens rather than "are you sure?"', async () => {
    renderApp()
    await screen.findByText('iPhone 15 Pro')
    fireEvent.click(within(rowFor('iPhone 15 Pro')).getByRole('button', { name: /Remove/ }))

    expect(await screen.findByText('Remove device')).toBeInTheDocument()
    expect(screen.getByText(/will need a confirmation code again/)).toBeInTheDocument()

    // Cancelling removes nothing.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText('Remove device')).not.toBeInTheDocument())
    expect(removeDevice).not.toHaveBeenCalled()
  })

  test('confirming removes that device and reloads the list', async () => {
    renderApp()
    await screen.findByText('iPhone 15 Pro')
    fireEvent.click(within(rowFor('iPhone 15 Pro')).getByRole('button', { name: /Remove/ }))

    const dialog = await screen.findByText('Remove device')
    const foot = dialog.closest('div').parentElement
    fireEvent.click(within(foot).getByRole('button', { name: /Remove/ }))

    await waitFor(() => expect(removeDevice).toHaveBeenCalledWith('phone'))
    await waitFor(() => expect(listDevices).toHaveBeenCalledTimes(2))
  })

  // The local uuid is what a later sign-in sends to skip verification. Left
  // behind, it would name a device the backend no longer knows.
  test('forgetting THIS browser clears the uuid stored in it', async () => {
    deviceStore.setDeviceUuid('this-one')
    renderApp()
    await screen.findByText('Chrome Web Portal')
    fireEvent.click(within(rowFor('Chrome Web Portal')).getByRole('button', { name: /Remove/ }))

    // Its wording is the one that names the consequence for the reader.
    expect(await screen.findByText(/This is the device you are signed in from/)).toBeInTheDocument()

    const dialog = screen.getByText('Remove device')
    const foot = dialog.closest('div').parentElement
    fireEvent.click(within(foot).getByRole('button', { name: /Remove/ }))

    await waitFor(() => expect(deviceStore.getDeviceUuid()).toBeNull())
  })

  test('removing another device leaves this browser’s uuid alone', async () => {
    deviceStore.setDeviceUuid('this-one')
    renderApp()
    await screen.findByText('iPhone 15 Pro')
    fireEvent.click(within(rowFor('iPhone 15 Pro')).getByRole('button', { name: /Remove/ }))

    const dialog = await screen.findByText('Remove device')
    const foot = dialog.closest('div').parentElement
    fireEvent.click(within(foot).getByRole('button', { name: /Remove/ }))

    await waitFor(() => expect(removeDevice).toHaveBeenCalled())
    expect(deviceStore.getDeviceUuid()).toBe('this-one')
  })

  test('an account with no devices gets an explanation, not an empty page', async () => {
    listDevices.mockResolvedValue([])
    renderApp()
    expect(await screen.findByText('No confirmed devices')).toBeInTheDocument()
  })
})
