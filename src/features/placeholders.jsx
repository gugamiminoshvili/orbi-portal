// Placeholder pages for routes not yet implemented.
// Tasks 10-15 replace these with the real feature pages one at a time.
import { Outlet, useParams } from 'react-router-dom'

export function NewsListPage() {
  return (
    <div className="page">
      <h1>News</h1>
    </div>
  )
}

export function NewsDetailPage() {
  const { id } = useParams()
  return (
    <div className="page">
      <h1>News {id}</h1>
    </div>
  )
}

export function ApartmentsPage() {
  return (
    <div className="page">
      <h1>My Apartments</h1>
    </div>
  )
}

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
