import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import NewsListPage from './features/news/NewsListPage'
import NewsDetailPage from './features/news/NewsDetailPage'
import ApartmentsPage from './features/apartments/ApartmentsPage'
import ApartmentDetailPage from './features/apartments/ApartmentDetailPage'
import MultiPayFlow from './features/pay/MultiPayFlow'
import PayRedirect from './features/pay/PayRedirect'
import SupportPage from './features/support/SupportPage'
import EmptyPane from './features/support/EmptyPane'
import NewTicketPane from './features/support/NewTicketPane'
import TicketChatPane from './features/support/TicketChatPane'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/apartments" element={<ApartmentsPage />} />
        <Route path="/apartments/:id" element={<ApartmentDetailPage />} />
        {/* Task P3-3: /pay is the multi-payment flow (complex -> utility ->
            apartments); /pay/:id is the old single-apartment deep link,
            kept working via PayRedirect (see that file for why). */}
        <Route path="/pay" element={<MultiPayFlow />} />
        <Route path="/pay/:id" element={<PayRedirect />} />
        <Route path="/support" element={<SupportPage />}>
          <Route index element={<EmptyPane />} />
          <Route path="new" element={<NewTicketPane />} />
          <Route path="t/:tid" element={<TicketChatPane />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
