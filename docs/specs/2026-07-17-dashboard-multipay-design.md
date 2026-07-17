# ORBI Portal — Phase 3: Dashboard + Multi-Payment Flow

**Date:** 2026-07-17
**Visual reference:** 7 screenshots from owner (dark "ORBI GROUP" design) — **flow/content reference ONLY; build in the existing portal design language** (green shell, current tokens/components). Owner's explicit instruction.
**Ground truth:** `scratchpad/sdd/live-dashboard-payloads.json` (live `communals`, `payment` GET, crm-less `tournover`/`schedule`), api-reference.md.

## Scope

In: Dashboard page (sidebar item becomes real), multi-payment flow replacing the v1 single-apartment pay page, `POST /payment/multi/` integration with method picker (bank card / Apple Pay / open banking with bank list / crypto / invoice PDF).
Out: Bookings and Visits, Your Devices, Finances submenu pages (stay disabled/coming-soon); Active offers / Additional contracts tiles ship as static "Coming soon" cards.

## Decisions

| Topic | Decision |
|---|---|
| Shell | UNCHANGED — current sidebar/header stay; only Sidebar's Dashboard item becomes enabled (icon 'home', route /dashboard) |
| Home route | `/` redirects to `/dashboard` (was /news); `*` fallback also /dashboard |
| Dashboard data | `GET /dashboard/communals/` (utility+maintenance sums & per-apartment detail), `GET /currency/rate/` (param format probed live), `GET /finance/tournover/` + `/finance/schedule/` (Contracts tile; `CUSTOMER_HAS_NO_CRM(_)ID` → graceful zero-state — note both error spellings), `GET /payment/` (unpaid invoice count) |
| Mixed currency | Maintenance sums arrive USD, utilities GEL (live-confirmed). Tiles show native currency; Total-debt card shows both lines + USD total converted via currency rate; `fmt(n, cur)` already supports symbol arg |
| Donut | Pure SVG (ProgressRing pattern), no chart lib |
| Multi-pay flow | New `/pay` route, 3 steps + method modal: (1) complex list from communals detail grouped by epcode→complex via properties; (2) utility category cards (maintenance/electricity/internettv) with unpaid counts; (3) apartment checkbox table, editable per-apartment amounts (default = outstanding), negative/credit rows disabled, All/Owner filter, summary panel (complex, utility, selected n/m, currency rate, payable total); Pay Now → method modal |
| Method modal | Options: Bank Card (fee 2.5%, max 3,000₾), Apple Pay (2.5%, 3,000₾), Online Bank (0.6%, 50,000₾ — expands inline bank list: Bank of Georgia, TBC, Credo, Liberty), Crypto (0.6%, 100,000₾), Invoice (PDF download). Fees/limits/banks HARDCODED from screens with FLAG comments until backend confirms. Continue → `POST /payment/multi/` |
| payment/multi mapping (ASSUMED, FLAGged) | services: [{epcode, amount, serviceType}] per selected apartment; Bank Card → direct_card:true; Apple Pay → direct_card:true + vendor:'applepay'; Online Bank → open_banking:true + vendor:<bank key>; Crypto → crypto:true; Invoice → as_invoice:true (response = invoice data → GET /payment/invoice/). Response assumed {url} for redirect vendors — same open-in-new-tab pattern as v1 payService |
| Old pay page | `/pay/:id` route kept as deep-link: redirects into the flow with apartment + utility preselected (service Pay buttons pass their service type) |
| Mock mode | Flow fully works from mock data (per-apartment balances derived from mock SERVICES/APTS); payment/multi mock returns fake {url}; invoice mock returns fake blob. All existing tests stay green |
| i18n | New `dashboard` namespace + `pay` additions, 3 locales, hand-translated FLAG |

## Backend questions (sent to developer)

1. `payment/multi` services[] exact schema + which flags per method + `vendor` values (bank keys?)
2. Fees/limits source of truth
3. `currency/rate/` param format
4. Invoice flow: as_invoice response → how to fetch the PDF (`GET /payment/invoice/?invoice_id&response_type`?)
