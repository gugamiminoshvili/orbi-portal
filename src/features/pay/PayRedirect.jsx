import { Navigate, useLocation } from 'react-router-dom'

// The v1 single-apartment deep link (`/pay/:id`). Task P3-3 retires the old
// PayPage wizard entirely in favor of the multi-payment flow at `/pay` — this
// route now exists only so old links keep working: the `:id` param itself is
// discarded (it was never the apartment CODE the new flow joins on anyway),
// and whatever router `state` the Link carried is forwarded as-is.
// MaintenanceCard/ElectricityCard/InternetCard's Pay links attach
// `state={{apartmentCode, utility}}` — MultiPayFlow reads that same shape
// off `location.state` to jump straight to step 3 with the apartment
// checked (see MultiPayFlow's preselect effect).
export default function PayRedirect() {
  const location = useLocation()
  return <Navigate to="/pay" state={location.state} replace />
}
