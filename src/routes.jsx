import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import NewsListPage from './features/news/NewsListPage'
import NewsDetailPage from './features/news/NewsDetailPage'
import ApartmentsPage from './features/apartments/ApartmentsPage'
import ApartmentDetailPage from './features/apartments/ApartmentDetailPage'
import PayPage from './features/pay/PayPage'
import SupportPage from './features/support/SupportPage'
import EmptyPane from './features/support/EmptyPane'
import NewTicketPane from './features/support/NewTicketPane'
import TicketChatPane from './features/support/TicketChatPane'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/news" replace />} />
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/apartments" element={<ApartmentsPage />} />
        <Route path="/apartments/:id" element={<ApartmentDetailPage />} />
        <Route path="/pay/:id" element={<PayPage />} />
        <Route path="/support" element={<SupportPage />}>
          <Route index element={<EmptyPane />} />
          <Route path="new" element={<NewTicketPane />} />
          <Route path="t/:tid" element={<TicketChatPane />} />
        </Route>
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Route>
    </Routes>
  )
}
