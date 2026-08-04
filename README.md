# ORBI Owner Portal

A React rewrite of the ORBI Owner Portal, built from the static HTML/CSS/JS
prototype in [`reference/orbi-portal-redesign.html`](reference/orbi-portal-redesign.html).
That file is the design source of truth — every page, component, and design
token in `src/` traces back to a specific block of markup/CSS/JS in it (see
the "Ported from reference..." comments throughout the codebase).

Owners use the portal to check their apartments' services (maintenance,
water, electricity, internet & TV, doors history), pay bills, read
management news, and get support — all against mock data by default, with a
single env switch to point at a real backend once one exists.

## Stack

- **React 19** + **Vite** — plain JavaScript, no TypeScript
- **react-router-dom** — client-side routing (`BrowserRouter`)
- **react-i18next** — English / Georgian / Russian, namespaced locale files
- **CSS Modules** — one `.module.css` per component/feature, design tokens
  defined once in `src/index.css` (`:root`) and referenced via `var(--…)`
- **Vitest** + **@testing-library/react** — component and unit tests
- **oxlint** — linting

## Commands

```bash
bun install        # install dependencies
bun run dev        # start the Vite dev server
bun run test       # run the test suite once (vitest run)
bun run test:watch # run tests in watch mode
bun run lint       # oxlint
bun run build      # production build -> dist/
bun run preview    # serve the production build locally
bun run smoke      # manual live-backend check (needs VITE_API_BASE + test creds) — see "Backend integration"
```

## Environment / mock-to-real-API switch

Copy `.env.example` to `.env` and adjust as needed:

```bash
VITE_USE_MOCK=true
VITE_API_BASE=
VITE_USE_PROXY=false
```

- **`VITE_USE_MOCK`** — `true` (default) serves every screen from the
  in-memory mock data in `src/api/mock/`, with an artificial 400–800 ms
  delay per call so skeleton loaders are visible, and skips the login gate
  entirely. Set to `false` to require a real login and route all requests
  through `VITE_API_BASE` instead.
- **`VITE_API_BASE`** — the real API's origin (and optional path prefix),
  e.g. `https://api.orbi.example.com`. Ignored while `VITE_USE_MOCK=true`.
- **`VITE_USE_PROXY`** — dev-only. `true` routes requests through the Vite
  dev server's `/mobileApi` proxy (to `VITE_API_BASE`) instead of calling
  `VITE_API_BASE` directly, sidestepping CORS in local dev. See "Backend
  integration" below for the full mode matrix.

Test credentials for the live smoke script (`bun run smoke`) go in
`.env.local` instead — it's gitignored and never read by the app itself,
only by the script:

```bash
# .env.local — gitignored, never commit real credentials
VITE_TEST_USER=
VITE_TEST_PASS=
```

Nothing else needs to change to switch a given screen over — see
"Backend integration" below.

## Folder map

```
src/
  api/
    client.js          # USE_MOCK flag, delay(), http() fetch wrapper
    mock/               # in-memory mock data (apartments, news, tickets, plans, finance, services)
    endpoints/          # one file per domain — the only layer that imports mock/ or calls http()
  components/
    layout/             # AppShell, Sidebar, Header, Breadcrumbs
    ui/                  # design-system primitives (Button, Card, Badge, Field, Skeleton, EmptyState, Icon, ProgressRing, CopyButton, Switch)
  context/               # ModalContext (focus-trapped dialog host), ToastContext, ThemeContext (light/dark)
  features/
    news/                # list, filters, detail, skeletons
    apartments/          # list, detail, service accordions (services/), modals (modals/)
    dashboard/            # Phase 3: dual-currency debt card + rates/contracts/unpaid-invoices tiles
    pay/                 # Phase 3: 3-step multi-apartment payment flow (complex -> utility ->
                          # apartment table) + method-picker modal -> POST payment/multi/;
                          # payFlowData.js holds the pure grouping/owed-amount helpers
    support/              # ticket list, chat pane, new-ticket pane
    guides/               # the company's process rules (handover / power of attorney /
                          # service / contact centre), rebuilt from the print posters in
                          # ../orbi-instructions/posters/; content (ka/en/ru) lives in
                          # guidesContent.js, one GuidePage renders every slug
  hooks/
    useAsync.js          # fetch-on-mount hook with a stale-response guard
  i18n/
    index.js             # i18next setup
    locales/             # en.json / ka.json / ru.json, one namespaced tree each
  utils/                 # format.js (fmt), doorCount.js, placeholder.js (ph — local gradient data-URIs, no external images), envFile.js (pure .env line parser, used by scripts/live-smoke.mjs)
  test/                  # vitest setup + smoke test
scripts/
  live-smoke.mjs         # manual, opt-in live-backend check — `bun run smoke` (see "Backend integration")
reference/
  orbi-portal-redesign.html   # the design source of truth (do not delete)
```

### Theming (light / dark)

Every colour in the app is a custom property declared twice in `src/index.css`
— once under `:root, [data-theme='light']` and once under `[data-theme='dark']`
— and component CSS only ever writes `var(--name)`. **Adding a raw hex or
`rgba()` to a module stylesheet breaks dark mode silently**, so add a token
instead. The two deliberate exceptions are commented where they appear: the QR
quiet zone and the bank tiles in the payment-method modal are literally white /
literally the bank's brand colour in both themes.

The values come from the owner's design-tool colour library, which names its
entries by role (Dark text, Light icon, Background 2, Water, TV & Internet,
Pending or ongoing, …). Each token in `index.css` carries a `library: <name>`
note, or says how it was derived; the trailing comment lists the library
colours the app has no role for yet, so nobody spends them by accident.

Three roles are easy to confuse:

- `--teal` is the brand green as a **fill**; text on it is `--on-accent`
  (white in light, near-black in dark, because the dark fill is brighter).
- `--teal-ink` is the brand green as a **foreground** — text, icons, links.
  In light mode it happens to equal `--teal`; in dark it does not.
- `--*-bg` / `--*-line` / `--*-ink` are the library's 10% tint, its 40%
  border, and a shade dark enough to read on that tint. A tinted panel wants
  all three, not a hand-picked hex.

The active theme is stored in `localStorage` under `orbi-theme` and stamped on
`<html data-theme>` by three places that must stay in step: the pre-paint
inline script in `index.html` (so a reload never flashes the wrong palette),
`src/utils/theme.js`, and `src/context/ThemeContext.jsx`. The user-facing
toggle is the "Dark mode" row of the header account menu.

## Backend integration

All data access goes through `src/api/endpoints/*.js` — pages and
components only ever import from there, never from `api/mock/` or
`api/client.js` directly. Each endpoint function has the same shape:

```js
export async function getApartment(id) {
  if (USE_MOCK) {
    await delay()
    return /* mock lookup */
  }
  return http(`/mobileApi/properties/v2/`) /* real branch: http() + adaptProperty() */
}
```

`src/api/client.js`'s `http()`/`httpMultipart()` attach the JWT `Authorization`
header, run the single-flight 401→refresh→retry flow, and parse the
`{code, msg, result, error}` envelope (throwing a typed `ApiError` on a
negative `code`). `src/api/auth.js` handles login/refresh/verify/logout.
`src/api/adapters/*.js` map each endpoint's DTO into the exact shape the UI
already consumes, so `features/`/`components/` never had to change.

### Mode matrix

| Mode | Env | Login required | Requests go to | When to use |
|---|---|---|---|---|
| **Mock** | `VITE_USE_MOCK=true` (default) | No — `RequireAuth` short-circuits | Nowhere (in-memory `src/api/mock/`) | Default; runs the whole app/demo with no backend at all |
| **Proxy-dev** | `VITE_USE_MOCK=false`, `VITE_API_BASE=<origin>`, `VITE_USE_PROXY=true` | Yes | Relative `/mobileApi/...`, proxied by the Vite dev server to `VITE_API_BASE` (`vite.config.js`'s `server.proxy`) | Local dev against a real backend whose CORS isn't (yet) configured for your dev origin |
| **Direct** | `VITE_USE_MOCK=false`, `VITE_API_BASE=<origin>`, `VITE_USE_PROXY=false`/unset | Yes | `VITE_API_BASE` directly, from the browser | Production build (there's no dev server to proxy through), or local dev once the backend allows your origin via CORS |

`VITE_USE_PROXY` only matters in `bun run dev` — a production build
(`bun run build`/`preview`) always calls `VITE_API_BASE` directly, since
there's no Vite dev server running to proxy through. The interaction lives in
two places: `vite.config.js` reads `VITE_API_BASE` via `loadEnv()` (function
config form) and, when set, proxies `/mobileApi` → that origin; `apiBase()`
in `src/api/client.js`/`src/api/auth.js` returns `''` (a relative path) when
`VITE_USE_PROXY=true`, so requests actually hit the same-origin dev proxy
instead of calling `VITE_API_BASE` cross-origin. Get these two out of sync
(proxy configured but the app still calling the absolute URL, or vice versa)
and you're back to a CORS error or a 404 against the Vite dev server.

### Env vars

| Var | Read by | Purpose |
|---|---|---|
| `VITE_USE_MOCK` | `src/api/client.js` | `true` (default): mock mode, no login. `false`: real endpoints + auth. |
| `VITE_API_BASE` | `src/api/client.js`/`auth.js`, `vite.config.js`, `scripts/live-smoke.mjs` | Real API origin. Ignored in mock mode. |
| `VITE_USE_PROXY` | `src/api/client.js`/`auth.js` | Dev-only. `true`: call relative paths so they hit the Vite dev proxy. |
| `VITE_TEST_USER` / `VITE_TEST_PASS` | `scripts/live-smoke.mjs` only | Test-account credentials, from `.env.local` (gitignored). Never read by the app; never logged. |

### Live smoke script

`scripts/live-smoke.mjs` is a plain Node script (no vitest, no bundler,
never run in CI) that exercises a real backend end to end:

```bash
bun run smoke
```

It reads `VITE_API_BASE`/`VITE_TEST_USER`/`VITE_TEST_PASS` from
`process.env`, falling back to `.env.local` then `.env` in the repo root
(a small line parser, `src/utils/envFile.js` — no `dotenv` dependency), and
refuses to run with a clear message if the base URL or credentials are
missing. It then: (1) logs in — if the account has a pending device
verification (`code:-2`), tokens are still issued under `result` and the
data endpoints work with them (confirmed live), so it prints a WARN and
proceeds rather than stopping; (2) `GET properties/v2`; (3) `GET news` page
1; (4) `GET tickets` (+ `tickets/subject/`); (5) `GET internettv/tariff`;
(6) `GET dashboard/communals` (Phase 3 — prints the utility/maintenance sums);
(7) `GET currency/rate` for today's date (Phase 3 — prints the first rate);
(8) `GET payment` (Phase 3 — prints the unpaid-invoice count). Checks 6-8 are
deliberately GET-only and never call `POST payment/multi/` (a real charge) —
that stays off-limits without explicit owner consent obtained outside the
script. Each check prints OK/FAIL, the HTTP status, and the first item run
through the same adapters the app uses (`src/api/adapters/*.js`), so a real
payload's shape can be checked against the guessed DTO fields before it ever
reaches the UI. Credentials and tokens are never printed — only whether
they're present.

### Phase 3: Dashboard + multi-payment flow

The sidebar's Dashboard item is now live (route `/dashboard`; `/` and
unknown paths redirect there instead of to `/news`). It combines four reads
— `GET dashboard/communals/` (utility + maintenance sums, plus per-apartment
detail), `GET currency/rate/` (NBG USD/EUR/RUB rates, called once per
currency with `?currency=<CODE>&date=<today>`), `GET finance/tournover/` +
`GET finance/schedule/` (the Contracts tile — gracefully zero-states on
either documented `CUSTOMER_HAS_NO_CRM(_)ID` spelling), and `GET payment/`
(unpaid-invoice count) — into one skeleton-while-loading page. See
`src/api/adapters/dashboard.js` and
`docs/specs/2026-07-17-dashboard-multipay-design.md` for the DTO shapes.

**Mixed currency:** live `communals` reports maintenance in USD
(`flatBalance.currency`) and utilities in GEL; `DashboardPage.jsx` and
`payFlowData.js`'s `owedFor`/`buildComplexes`/`utilityCardData` all branch on
that `currency` field rather than assuming USD — when it's `'GEL'` (as mock
mode's `mockCommunals` deliberately reports, since its balances are
GEL-native SERVICES numbers) sums are combined as a plain add with no rate
conversion and rendered in `₾`; only a genuinely-`'USD'` figure is run
through the USD/GEL rate. This was carried over from the P3-3 review as a
fix in this task — the dashboard previously hardcoded `$` and always divided
utilities by the rate regardless of what currency maintenance actually
reported.

**Multi-payment flow** (`/pay`, replacing the old single-apartment pay page)
is a 3-step wizard — complex → utility category → apartment checkbox table
with a summary panel — ending in a method-picker modal (Bank Card, Apple
Pay, Online Bank with a bank list, Crypto, Invoice/PDF) that calls `POST
payment/multi/`. The old `/pay/:id` deep link still works, redirecting into
the flow with the apartment + utility preselected. All of it runs fully off
mock data (`payment/multi` mock returns a fake `{url}`, invoice download
returns a fake `Blob`) — see `src/features/pay/` and `payFlowData.js`'s
comments for the sign convention (`owedFor` flips balance sign so a positive
number always means "owed").

### Open questions for the backend team

Carried from `docs/specs/2026-07-16-backend-integration-design.md` §5, plus
what's been flagged in the adapters while wiring I1–I8 (see the `FLAG`
comments in `src/api/adapters/*.js` for the full detail on each):

1. Base URL (dev/staging) and a test account — nothing here has been run
   against a live server yet.
2. CORS: is `VITE_API_BASE` planned to allow browser origins directly
   (**Direct** mode), or should local dev always go through the proxy
   (**Proxy-dev** mode) until a prod domain allowlist exists?
3. `GET /mobileApi/news/`: does it support a category filter and/or sort
   order? The UI hides those controls in real mode until confirmed.
4. `serviceType` enum for `POST /mobileApi/payment/` — assumed
   `apartment`/`electricity`/`internettv`/`water` (mirroring `finance`'s
   `accountType`), only `apartment` is currently sent.
5. **`flat_id`: `id` vs `objectId`.** `/properties(/v2)/` returns both `id`
   and `objectId` per property, and only `objectId` is confirmed to be what
   `/flat/{flat_id}/` expects (the list's own `id` reads as a separate
   customer-property relation id, not a flat id) — needs confirmation, since
   using the wrong one would 404 or return the wrong flat's detail.
6. **`epcode` type.** The property list's example shows `epcode` as a
   string (e.g. `"GE-BAT-OCT-A-3026"`), but `POST /mobileApi/payment/`'s own
   doc types its `epcode` body param as an **integer** — these can't both be
   the same value; needs a confirmed source for the integer `epcode`
   `payment/` actually expects.
7. **Ticket `reply` semantics.** `GET /tickets/{id}/messages/` returns a
   `reply` field on each message with no documented meaning; the adapter
   guesses `reply === 0` means "the customer's own message" (vs. any nonzero
   value meaning "staff reply"). If it instead means a running reply index,
   every message after the customer's first follow-up would be
   misclassified as staff.
8. **Ticket `status` vocabulary.** Only `closed_at` (present) or a literal
   `status === 'closed'` currently map to the closed bucket; everything else
   is "active". If the real vocabulary has more values (e.g.
   `in_progress`/`pending`), those would currently read as active by
   default — needs the full status list to confirm.
9. **Ticket ↔ apartment association.** `Ticket` has no flat/apartment
   reference field at all in the documented shape (`depId` reads as an
   internal support-department id) — ticket creation's `apt` field is
   omitted from the real request body entirely rather than guessed at a
   wrong key.
10. **Elided DTO shapes** (doc says only "..."/a bare description, no field
    names) — all guessed from context and flagged in the corresponding
    adapter, to be corrected once real payloads are seen via `bun run
    smoke`:
    - `GET /mobileApi/flat/{flat_id}/` (detail-only fields:
      building/addr/cadastral/waterCode/apCode)
    - `GET /mobileApi/news/{id}` `NewsArticleSerializer` fields (title/
      description/category/created_at/image/read_time)
    - `GET/PATCH /mobileApi/internettv/` agreement fields (provider/
      tariff_net_id/price/status/next_billing_date/billing_cycle_days/
      days_left/boost)
    - `GET /mobileApi/internettv/tariff/`'s per-entry fields inside
      `internet`/`tv`/`boost`/`combined`
    - `GET /mobileApi/lockHistory/`'s per-record fields (no existing v1 mock
      shape to check field names against at all)
11. **`POST /mobileApi/device/`'s `device_info` shape — CONFIRMED (Task L2).**
    docs/api-reference.md doesn't name its fields; the backend developer
    confirmed live that it must be exactly `device_name`,
    `device_manufacturer`, `device_model`, `platform` — any other field name
    reads as `None` server-side (previously caused a 500), and `platform`
    must be one of `android`/`ios`/`Linux`/`Windows`/`macOS`/`Win10`/
    `ipados`/`Android` (wrong value → code `-1` "platform is not valid").
    `src/utils/deviceInfo.js` builds this object; `src/api/auth.js`'s
    `registerDevice()` sends it. **Still unconfirmed and FLAGged in
    `verifyCode()`'s comment:** whether verifying the device (`POST
    /mobileApi/device/verify/`) consumes the same one-time code that `POST
    /mobileApi/auth/verify/` also checks — if it does, calling both per login
    could make the second call fail even on a correct code. `verifyCode()`
    tolerates either call failing (treats the pair as one unit, success if
    either succeeds) until this is verified live.
12. **`payment/multi/` `services[]` schema + per-method flags/`vendor`
    values.** The doc only names the flags (`vendor`, `as_invoice`,
    `open_banking`, `direct_card`, `crypto`), not which method maps to which
    combination or what `vendor` bank keys are valid — `src/api/endpoints/
    pay.js`'s `multiPayFlags()` assumes Bank Card → `direct_card:true`,
    Apple Pay → `direct_card:true, vendor:'applepay'`, Online Bank →
    `open_banking:true, vendor:<bog|tbc|credo|liberty>`, Crypto →
    `crypto:true`, Invoice → `as_invoice:true`. The response shape for
    redirect methods is likewise assumed to be `{url}` (v1's `payService`
    pattern), un-adapted since the doc gives no field names.
13. **Payment-method fees/limits/bank list source of truth.** The 2.5%/0.6%
    fee percentages, the ₾3,000/₾50,000/₾100,000 per-method caps, and the
    four online-bank options (Bank of Georgia/TBC/Credo/Liberty) in
    `src/features/pay/MethodModal.jsx` are all hardcoded from the owner's
    screenshots, not read from any API — needs a real source (a config
    endpoint? doc constants?) so they can't drift from what the payment
    provider actually enforces.
14. **Invoice flow: `as_invoice` response shape + `GET payment/invoice/`'s
    `response_type` value.** `payMulti()`'s invoice branch assumes the
    invoice id comes back as one of `invoiceId`/`invoice_id`/`id`; `GET
    /mobileApi/payment/invoice/`'s `response_type` is a required param the
    doc names but never enumerates — `'pdf'` is assumed by analogy with
    `finance/`'s `response_format=pdf`.
15. **Prepayment/overpayment policy on `payment/multi/`.** `ApartmentsStep`'s
    editable per-apartment amount is capped at the outstanding balance
    client-side (partial payment is allowed, paying more isn't) purely as a
    safe default — whether the backend actually accepts an amount greater
    than what's owed (prepayment/credit) is unconfirmed.
16. **`flatBalance` (USD maintenance) vs. `communal` (GEL utilities)
    reconciliation.** The live sample confirms maintenance genuinely arrives
    in USD while utilities are GEL — this task made the dashboard and
    multi-pay flow's math currency-conditional on each side's own `currency`
    field rather than assuming USD, but it's still unconfirmed whether
    `payment/multi/`'s body expects a maintenance amount already converted
    to GEL (as `payFlowData.js`'s `owedFor` does today, FLAGged) or the raw
    USD figure — no live sample of a submitted multi-pay body exists to
    check against.
17. **Sign convention on balances — BLOCKING a UI change (raised 2026-07-30).**
    Everything the app does today assumes **negative = owed**: the dashboard
    renders `abs(flatBalance.debt_sum)` as "Maintenance Debt",
    `payFlowData.js`'s `owedFor` returns `-balance` and only lets
    negative-balance rows be selected for payment, and `.money.neg` paints
    them red. The live account matches that naming — one flat at
    `apartmentBalance` −637.12, three at +148.13/+346.50/+163.08, with
    `debt_sum` = the sum of the negatives and `balance_sum` = the sum of the
    positives. The owner reports the opposite for maintenance and
    electricity (negative = the resident is **in advance**, internet being
    the one exception where negative really is a debt). Both can't hold. If
    the owner's reading is right this is not a colour tweak: the dashboard
    figure, which rows the multi-pay flow offers to charge, and the red/green
    treatment all invert. Needs the backend team to state, per field
    (`flatBalance.debt_sum`/`balance_sum`, `apartmentBalance`,
    `electricityBalanceGEL`, `InternetTVBalanceGEL`), which sign means the
    resident owes money.

To wire up more of a real backend once these are answered:

1. Set `VITE_API_BASE` (+ `VITE_USE_PROXY` in dev) and `VITE_USE_MOCK=false`.
2. Extend the `else` branch of the relevant `endpoints/*.js` function and,
   if the DTO needs mapping, add/adjust an `adapt*` in `adapters/*.js` —
   fixtures for adapter unit tests live in `adapters/__fixtures__/`.
3. Run `bun run smoke` against a real account to sanity-check the new
   branch before it reaches the UI.
4. Delete the corresponding mock module(s) under `api/mock/` only once
   every endpoint that reads them has been switched over — several mock
   modules are shared across more than one endpoint file.

Nothing in `features/` or `components/` needs to change — they're already
written against the endpoint contract, not the mock data.
