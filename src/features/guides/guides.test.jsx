import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'
import { GUIDES } from './guidesContent'

function renderApp(entries) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('guide pages', () => {
  test('every guide has all three languages for every string', () => {
    // The posters were trilingual; a missing translation would silently fall
    // back to Georgian for an English or Russian reader.
    const missing = []
    function check(value, path) {
      if (!value || typeof value !== 'object') return
      const isText = 'ka' in value || 'en' in value || 'ru' in value
      if (isText) {
        for (const lang of ['ka', 'en', 'ru']) {
          if (!value[lang]) missing.push(`${path}.${lang}`)
        }
        return
      }
      for (const [key, child] of Object.entries(value)) {
        if (Array.isArray(child)) child.forEach((c, i) => check(c, `${path}.${key}[${i}]`))
        else check(child, `${path}.${key}`)
      }
    }
    for (const guide of GUIDES) check(guide, guide.slug)
    expect(missing).toEqual([])
  })

  test('the handover guide renders its sections, revenue split and steps', async () => {
    renderApp(['/guides/handover'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Apartment handover' })).toBeInTheDocument()
    expect(screen.getByText('Rental Department')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Hotel standard' })).toBeInTheDocument()
    // The 91/9 split bar and its legend.
    expect(screen.getByRole('img', { name: '91% - Owner' })).toBeInTheDocument()
    expect(screen.getByText('9%')).toBeInTheDocument()
    expect(screen.getByText('9% is the company’s commission')).toBeInTheDocument()
    // Steps come out as an ordered list of four.
    expect(screen.getByRole('heading', { level: 3, name: 'Application' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Handover' })).toBeInTheDocument()
  })

  test('**bold** markers render as <strong>, not as literal asterisks', async () => {
    renderApp(['/guides/power-of-attorney'])

    await screen.findByRole('heading', { level: 1, name: 'Power of Attorney' })
    const strong = screen.getByText('mandatory')
    expect(strong.tagName).toBe('STRONG')
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
  })

  test('the service guide renders its stats strip', async () => {
    renderApp(['/guides/service'])

    await screen.findByRole('heading', { level: 1, name: 'Service' })
    expect(screen.getByText('3500+')).toBeInTheDocument()
    expect(screen.getByText('Surveillance cameras')).toBeInTheDocument()
    // Two stats share the value "150+" — both cells must be there.
    expect(screen.getAllByText('150+')).toHaveLength(2)
  })

  test('the contact-centre guide renders its checklists and closing banner', async () => {
    renderApp(['/guides/contact-centre'])

    await screen.findByRole('heading', { level: 1, name: 'Contact Centre' })
    expect(screen.getByText('Improve coordination between departments')).toBeInTheDocument()
    expect(screen.getByText('A single communication channel')).toBeInTheDocument()
    expect(
      screen.getByText('Contact Centre - your simple way to communicate with ORBI GROUP.')
    ).toBeInTheDocument()
  })

  // Every number is a WhatsApp line and a tap must land in that chat (owner
  // 2026-09-07). wa.me rejects a leading plus and any spaces, so the dialling
  // form and the printed form are two different fields — and this is what
  // catches a typo in either.
  test('each guide links its own WhatsApp numbers', async () => {
    for (const guide of GUIDES) {
      const { unmount } = renderApp([`/guides/${guide.slug}`])
      await screen.findByRole('heading', { level: 1 })

      const links = [...document.querySelectorAll('a[href^="https://wa.me/"]')]
      expect(links).toHaveLength(guide.contacts.length)

      guide.contacts.forEach((c, i) => {
        expect(links[i]).toHaveAttribute('href', `https://wa.me/${c.wa}`)
        expect(links[i]).toHaveAttribute('target', '_blank')
        expect(links[i]).toHaveAttribute('rel', expect.stringContaining('noopener'))
        // The dialled digits are the printed number with the plus and the
        // spaces taken out — nothing else.
        expect(c.wa).toBe(c.display.replace(/[^0-9]/g, ''))
        expect(links[i]).toHaveTextContent(c.display)
      })
      unmount()
    }
  })

  test('only the contact centre labels its numbers — its blocks are not interchangeable', async () => {
    renderApp(['/guides/contact-centre'])
    await screen.findByRole('heading', { level: 1 })
    for (const label of ['Block A', 'Block C', 'Block D1', 'Block D2']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }

    const others = GUIDES.filter((g) => g.slug !== 'contact-centre')
    for (const g of others) {
      expect(g.contacts.every((c) => !c.label)).toBe(true)
    }
  })

  test('an unknown slug redirects to the first guide instead of erroring', async () => {
    renderApp(['/guides/nope'])
    expect(await screen.findByRole('heading', { level: 1, name: 'Apartment handover' })).toBeInTheDocument()
  })

  test('guide text follows the app language', async () => {
    await i18n.changeLanguage('ka')
    try {
      renderApp(['/guides/service'])
      expect(await screen.findByRole('heading', { level: 1, name: 'სერვისი' })).toBeInTheDocument()
      expect(screen.getByText('საერთო ქონების მოვლა')).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  test('all four guides are reachable from the sidebar', async () => {
    renderApp(['/dashboard'])

    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    const expected = {
      'Apartment handover': '/guides/handover',
      'Power of Attorney': '/guides/power-of-attorney',
      Service: '/guides/service',
      'Contact Centre': '/guides/contact-centre',
    }
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })
})
