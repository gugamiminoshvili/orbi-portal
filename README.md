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
npm install        # install dependencies
npm run dev         # start the Vite dev server
npm test            # run the test suite once (vitest run)
npm run test:watch  # run tests in watch mode
npm run lint        # oxlint
npm run build       # production build -> dist/
npm run preview     # serve the production build locally
```

## Environment / mock-to-real-API switch

Copy `.env.example` to `.env` and adjust as needed:

```bash
VITE_API_BASE=
VITE_USE_MOCK=true
```

- **`VITE_USE_MOCK`** — `true` (default) serves every screen from the
  in-memory mock data in `src/api/mock/`, with an artificial 400–800 ms
  delay per call so skeleton loaders are visible. Set to `false` to route
  all requests through `VITE_API_BASE` instead.
- **`VITE_API_BASE`** — the origin (and optional path prefix) prepended to
  every real request, e.g. `https://api.orbi.example.com`. Ignored while
  `VITE_USE_MOCK=true`.

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
    ui/                  # design-system primitives (Button, Card, Badge, Field, Skeleton, EmptyState, Icon, ProgressRing, CopyButton)
  context/               # ModalContext (focus-trapped dialog host) and ToastContext
  features/
    news/                # list, filters, detail, skeletons
    apartments/          # list, detail, service accordions (services/), modals (modals/)
    pay/                 # 3-step payment flow (amount -> method -> confirm -> success)
    support/              # ticket list, chat pane, new-ticket pane
  hooks/
    useAsync.js          # fetch-on-mount hook with a stale-response guard
  i18n/
    index.js             # i18next setup
    locales/             # en.json / ka.json / ru.json, one namespaced tree each
  utils/                 # format.js (fmt), doorCount.js, placeholder.js (ph — local gradient data-URIs, no external images)
  test/                  # vitest setup + smoke test
reference/
  orbi-portal-redesign.html   # the design source of truth (do not delete)
```

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
  return http(`/apartments/${id}`)
}
```

To wire up a real backend:

1. Set `VITE_API_BASE` to the API origin and `VITE_USE_MOCK=false`.
2. Implement the routes each `endpoints/*.js` file already calls through
   `http()` (path, method, and body shape are visible right there in the
   `else` branch) — `apartments.js`, `news.js`, `pay.js`, and `support.js`.
3. `http()` in `src/api/client.js` is a minimal `fetch` wrapper (no auth
   headers, no `Content-Type` on POST yet, throws on non-2xx) — extend it
   there once the real API's auth/error-envelope conventions are known.
   That's the one place to add things like bearer tokens or retry logic
   without touching any endpoint file.
4. Delete the corresponding mock module(s) under `api/mock/` only once
   every endpoint that reads them has been switched over — several mock
   modules are shared across more than one endpoint file.

Nothing in `features/` or `components/` needs to change — they're already
written against the endpoint contract, not the mock data.
