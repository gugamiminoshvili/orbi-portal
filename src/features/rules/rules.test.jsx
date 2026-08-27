import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { setLang } from '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import RulesPage from './RulesPage'
import { RULES_DOCS, defaultDocLang } from './rulesDocs'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/rules']}>
      <ToastProvider>
        <RulesPage />
      </ToastProvider>
    </MemoryRouter>
  )
}

// Scoped by data-doc rather than by a hashed CSS-module class, which would
// also match the card's inner blocks.
const cardFor = (id) => document.querySelector(`[data-doc="${id}"]`)

beforeEach(() => setLang('en'))

describe('rulesDocs', () => {
  test('two documents, each published in Georgian and English only', () => {
    expect(RULES_DOCS).toHaveLength(2)
    for (const doc of RULES_DOCS) {
      expect(Object.keys(doc.files).sort()).toEqual(['en', 'ka'])
    }
  })

  test('a Russian reader is given English, since there is no Russian text', () => {
    expect(defaultDocLang('ka')).toBe('ka')
    expect(defaultDocLang('en')).toBe('en')
    expect(defaultDocLang('ru')).toBe('en')
  })
})

describe('RulesPage', () => {
  test('shows both documents and no others', () => {
    renderPage()
    expect(screen.getByText('Hotel Regulation')).toBeInTheDocument()
    expect(screen.getByText('Service Agreement Regulation')).toBeInTheDocument()
    // The design showed four; only two exist.
    expect(screen.getAllByText('Download')).toHaveLength(2)
    for (const gone of ['House Rules', 'Building Policies', 'Safety Guidelines', 'Terms & Conditions']) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument()
    }
  })

  test('offers two languages, never Russian', () => {
    renderPage()
    const card = cardFor('hotel')
    const chips = within(card).getAllByRole('radio')
    expect(chips.map((c) => c.textContent)).toEqual(['GE', 'EN'])
  })

  test('Preview opens the PDF in a new tab; Download saves it under its own name', () => {
    renderPage()
    const card = cardFor('hotel')

    const preview = within(card).getByRole('link', { name: /Preview/ })
    expect(preview).toHaveAttribute('href', '/documents/hotel-regulation-en.pdf')
    expect(preview).toHaveAttribute('target', '_blank')
    // Without this a new tab can reach back into the opener.
    expect(preview).toHaveAttribute('rel', expect.stringContaining('noopener'))

    const download = within(card).getByRole('link', { name: /Download/ })
    expect(download).toHaveAttribute('href', '/documents/hotel-regulation-en.pdf')
    expect(download).toHaveAttribute('download', 'Hotel Regulation.pdf')
  })

  test('choosing a language swaps the file both buttons point at', () => {
    renderPage()
    const card = cardFor('hotel')
    fireEvent.click(within(card).getByRole('radio', { name: 'GE' }))

    expect(within(card).getByRole('link', { name: /Preview/ }))
      .toHaveAttribute('href', '/documents/hotel-regulation-ka.pdf')
    expect(within(card).getByRole('link', { name: /Download/ }))
      .toHaveAttribute('download', 'სასტუმროს წესები და პირობები.pdf')
    // The size shown follows the file, not the card.
    expect(within(card).getByText('3.6 MB')).toBeInTheDocument()
  })

  test('the language is chosen per document, not once for the page', () => {
    renderPage()
    fireEvent.click(within(cardFor('hotel')).getByRole('radio', { name: 'GE' }))

    expect(within(cardFor('service')).getByRole('radio', { name: 'EN' }))
      .toHaveAttribute('aria-checked', 'true')
  })

  test('a Georgian reader gets the Georgian file first', () => {
    setLang('ka')
    renderPage()
    const card = cardFor('hotel')
    expect(within(card).getByRole('link', { name: /ნახვა/ }))
      .toHaveAttribute('href', '/documents/hotel-regulation-ka.pdf')
  })

  test('the help strip routes to support', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Contact Centre/ })).toHaveAttribute('href', '/support')
  })
})
