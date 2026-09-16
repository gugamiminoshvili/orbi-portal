import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { ModalProvider } from '../../context/ModalContext'
import { AppRoutes } from '../../routes'
import { publicGuideUrl } from './guidesContent'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ModalProvider>
          <AppRoutes />
        </ModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  delete navigator.share
})
afterEach(() => {
  delete navigator.share
})

describe('publicGuideUrl', () => {
  // The four links the owner published (2026-09-16).
  test('builds the guest URL for every guide slug', () => {
    expect(publicGuideUrl('handover')).toBe('https://myorbi.orbi.ge:14643/guest/handover')
    expect(publicGuideUrl('service')).toBe('https://myorbi.orbi.ge:14643/guest/service')
    expect(publicGuideUrl('contact-centre')).toBe('https://myorbi.orbi.ge:14643/guest/contact-centre')
    expect(publicGuideUrl('power-of-attorney')).toBe('https://myorbi.orbi.ge:14643/guest/power-of-attorney')
  })

  test('no slug, no link', () => {
    expect(publicGuideUrl('')).toBe(null)
  })
})

describe('the guide share button', () => {
  // The whole point: what gets shared is the sign-in-free copy, not the
  // portal page the owner is reading.
  test('shares the public link, not the portal URL', async () => {
    renderAt('/guides/service')
    const btn = await screen.findByRole('button', { name: /share link/i })
    expect(btn).toHaveAttribute('data-share', 'https://myorbi.orbi.ge:14643/guest/service')

    fireEvent.click(btn)
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://myorbi.orbi.ge:14643/guest/service')
    )
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })

  test('each guide shares its own link', async () => {
    renderAt('/guides/power-of-attorney')
    expect(await screen.findByRole('button', { name: /share link/i })).toHaveAttribute(
      'data-share',
      'https://myorbi.orbi.ge:14643/guest/power-of-attorney'
    )
  })

  // A phone has a share sheet; using it instead of the clipboard is the
  // whole reason the button is not called "Copy link".
  test('prefers the native share sheet where there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    navigator.share = share
    renderAt('/guides/handover')

    fireEvent.click(await screen.findByRole('button', { name: /share link/i }))

    await waitFor(() => expect(share).toHaveBeenCalledWith({
      title: 'Apartment handover',
      url: 'https://myorbi.orbi.ge:14643/guest/handover',
    }))
    expect(writeText).not.toHaveBeenCalled()
  })

  // Dismissing the sheet is a decision, not a failure - it must not leave a
  // "Link copied" toast claiming something happened.
  test('cancelling the sheet copies nothing and says nothing', async () => {
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }))
    renderAt('/guides/handover')

    fireEvent.click(await screen.findByRole('button', { name: /share link/i }))

    await waitFor(() => expect(navigator.share).toHaveBeenCalled())
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument()
  })

  test('a sheet that fails for any other reason falls back to the clipboard', async () => {
    navigator.share = vi.fn().mockRejectedValue(new Error('not allowed'))
    renderAt('/guides/contact-centre')

    fireEvent.click(await screen.findByRole('button', { name: /share link/i }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://myorbi.orbi.ge:14643/guest/contact-centre')
    )
  })

  // An insecure context has no clipboard. Showing the link beats claiming a
  // copy that never happened.
  test('no clipboard: the link itself is shown', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    renderAt('/guides/service')

    fireEvent.click(await screen.findByRole('button', { name: /share link/i }))

    expect(await screen.findByText('https://myorbi.orbi.ge:14643/guest/service')).toBeInTheDocument()
  })
})
