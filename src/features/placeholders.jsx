// Placeholder pages for routes not yet implemented.
// Tasks 11-15 replace these with the real feature pages one at a time.
// (News was replaced by src/features/news/* in Task 10.)
import { Outlet, useParams } from 'react-router-dom'

export function ApartmentDetailPage() {
  const { id } = useParams()
  return (
    <div className="page">
      <h1>Apartment {id}</h1>
    </div>
  )
}

export function PayPage() {
  const { id } = useParams()
  return (
    <div className="page">
      <h1>Pay {id}</h1>
    </div>
  )
}

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
