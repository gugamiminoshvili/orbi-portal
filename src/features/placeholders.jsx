// Placeholder pages for routes not yet implemented.
// Tasks 11-15 replace these with the real feature pages one at a time.
// (News was replaced by src/features/news/* in Task 10, apartment detail by
// src/features/apartments/ApartmentDetailPage in Task 12, pay by
// src/features/pay/PayPage in Task 14.)
import { Outlet, useParams } from 'react-router-dom'

export function SupportPage() {
  return (
    <div className="page">
      <h1>Support</h1>
      <p>Support home</p>
      <Outlet />
    </div>
  )
}

export function NewTicketPane() {
  return <div>New ticket</div>
}

export function TicketChatPane() {
  const { tid } = useParams()
  return <div>Ticket {tid}</div>
}
