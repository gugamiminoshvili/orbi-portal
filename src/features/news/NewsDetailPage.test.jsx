import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../../i18n'
import { ToastProvider } from '../../context/ToastContext'
import { AppRoutes } from '../../routes'

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>
  )
}

test('unknown news id shows not-found state instead of endless skeleton', async () => {
  renderApp(['/news/9999'])
  expect(await screen.findByText('Article not found')).toBeInTheDocument()
  // both the top back button and the empty-state link point back to the list
  const backLinks = screen.getAllByRole('link', { name: 'Back to News' })
  expect(backLinks.length).toBeGreaterThanOrEqual(2)
  for (const link of backLinks) expect(link).toHaveAttribute('href', '/news')
})

test('valid news id renders the article', async () => {
  renderApp(['/news/2'])
  expect(
    await screen.findByRole('heading', { name: 'Scheduled elevator maintenance in ORBI City Block B' })
  ).toBeInTheDocument()
  expect(screen.getByText('Attachments')).toBeInTheDocument()
  expect(screen.getByText('Related news')).toBeInTheDocument()
})
