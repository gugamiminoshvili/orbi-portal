// Real-mode tests for NewsDetailPage: with USE_MOCK forced false (same
// vi.mock pattern as the other *.real.test files), the article body is the
// CMS's content_* HTML — it must render inside the prose wrapper but pass
// through DOMPurify first, so script/event-handler payloads in a
// compromised or mistyped CMS entry never execute in the portal.
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, USE_MOCK: false, http: vi.fn() }
})

vi.mock('../../api/endpoints/news', () => ({
  getNews: vi.fn(),
  listNews: vi.fn(),
}))

import { getNews, listNews } from '../../api/endpoints/news'

const ITEM = {
  id: 1235,
  cat: 'Announcement',
  ts: 20260126,
  date: 'Jan 26, 2026',
  title: 'Live article',
  excerpt: 'The lead paragraph',
  body: '<p>Safe <b>content</b></p><script>window.__pwned = true</script><img src="x" onerror="window.__pwned = true">',
  read: '2 min',
  seed: 1235,
  pinned: false,
}

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  delete window.__pwned
  getNews.mockReset().mockResolvedValue(ITEM)
  listNews.mockReset().mockResolvedValue({ items: [], count: 0, next: null })
})

describe('NewsDetailPage (real mode)', () => {
  test('renders the CMS body HTML sanitized — script tags and event handlers are stripped', async () => {
    const { container } = renderApp(['/news/1235'])

    expect(await screen.findByRole('heading', { name: 'Live article' })).toBeInTheDocument()
    // the safe markup came through...
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('The lead paragraph')).toBeInTheDocument()
    // ...but nothing executable did
    expect(container.querySelector('script')).toBeNull()
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('onerror')).toBeNull()
    }
    expect(window.__pwned).toBeUndefined()
  })

  test('hides the fabricated category chip and the mock-only attachments card', async () => {
    renderApp(['/news/1235'])

    await screen.findByRole('heading', { name: 'Live article' })
    expect(screen.queryByText('Announcement')).not.toBeInTheDocument()
    expect(screen.queryByText('Attachments')).not.toBeInTheDocument()
  })
})
