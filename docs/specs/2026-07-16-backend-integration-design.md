# ORBI Portal — Backend Integration Design (Phase 2)

**Date:** 2026-07-16
**API reference:** `docs/api-reference.md` (mobileApi, JWT auth)
**Precondition gaps (pending from backend team):** base URL, staging test account, CORS for browser origins. Everything below is buildable and testable without them via fetch-stubbed tests; live verification happens when the URL arrives.

## 1. Scope

In: authentication (login, refresh, device verification, logout), wiring all five existing v1 features to real endpoints via per-endpoint adapters, payment redirect flow, language sync to backend, error envelope handling.
Out (later phases): registration, password reset flows, Dashboard/Invoices/Reports/Settings pages, notifications, visits/keys, feedback.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Token storage | `localStorage` (`orbi-access`, `orbi-refresh`) | Standard for this app class; portal already assumes persistent session |
| Refresh strategy | On 401 → one `POST /mobileApi/refresh/` retry → replay original request; failure → logout + redirect `/login` | Single-flight lock so concurrent 401s trigger one refresh |
| Auth UI | `/login` route outside AppShell (own centered card layout, same tokens/i18n); device-verify step (`code:-2`) rendered in the same card | API may return pending-verification state |
| Route guard | All existing routes behind `<RequireAuth>`; unauthenticated → `/login` with return-path | |
| Error envelope | `http()` parses `{code, msg, result, error}`; `code < 0` → typed `ApiError{code, msg, errorCode}`; toasts show translated message by `errorCode` key with `msg` fallback | |
| Adapters | One `adapt*` function per endpoint in `src/api/adapters/*.js`, mapping DTO → the exact shapes components already consume (NewsItem, Apt+services, Ticket…) | UI stays untouched; mock mode keeps working via `VITE_USE_MOCK` |
| Payment | Step 1 (amount) kept → `POST /mobileApi/payment/` `{epcode, amount, serviceType}` → open returned `url` in new tab + "payment opened" state with recheck button; in-app method/confirm steps removed in real mode (provider handles them) | API is redirect-based |
| Language | UI `ka` ↔ API `ge` mapped in one util (`langToApi/langFromApi`); `setLang` also fires `PATCH /mobileApi/user/ {lang}` when authenticated | API uses `ge` |
| News pagination | Real mode: server-side (`page`, size 10, `search` param); `applyNewsQuery` stays for mock mode only; sort/category filters hidden in real mode if API lacks them (confirm with backend — flagged) | API paginates |
| Doors calendar | `GET /mobileApi/lockHistory/?apartmentId&start_date&end_date`; adapter aggregates entries per day to replace `doorCount` in real mode | |
| Internet & TV | tariffs `GET /internettv/tariff/`; agreement `GET /internettv/?flat=`; pause `PATCH /internettv/pause/`; package `POST /internettv/update_package/`; boost `GET boost-net/list/` + `POST boost-net/activate/` | Direct fit to existing modals |
| Support | list `GET /tickets/` (server pagination), messages `GET/POST /tickets/{id}/messages/`, create `POST /tickets/`, topics `GET /tickets/subject/` (localized), attachments `POST /tickets/file/` (multipart) — attach button becomes real upload | |
| Electricity reports | `GET /finance/?flatId&accountType=electricity&response_format=pdf` → blob download | Replaces fake generate step |
| Apartments | list `GET /properties/v2/` (+`apartment_type` for role filter), detail `GET /flat/{flat_id}/` | Balances map to service cards |
| Dev CORS | Vite dev proxy `/mobileApi` → `VITE_API_BASE` (avoids CORS in dev); direct calls in production build | Works even if backend CORS lags |
| Test creds | `VITE_TEST_USER`/`VITE_TEST_PASS` from `.env.local` (gitignored), used only by opt-in live smoke test script, never committed | |

## 3. Architecture changes

```
src/
  api/
    client.js          # + auth header, 401→refresh→retry, error envelope, ApiError
    auth.js            # login(), refreshTokens(), verifyDevice(), logout(); token store
    adapters/          # news.js apartments.js internet.js support.js finance.js
    endpoints/*        # real branches filled: http() + adapt*(); mock branches unchanged
  context/AuthContext.jsx   # user, status, login/logout; RequireAuth component
  features/auth/LoginPage.jsx (+ VerifyStep)  # /login route
```

Mode matrix: `VITE_USE_MOCK=true` → v1 behavior exactly as today (no login required — RequireAuth short-circuits in mock mode). `false` → JWT + real endpoints. This keeps the GitHub demo runnable without backend.

## 4. Testing

- Unit: token store, refresh single-flight (fake fetch 401→refresh→replay), error envelope parsing, every adapter (fixture DTOs copied from api-reference.md examples → expected UI shapes), lang mapping.
- Component: LoginPage (success, bad credentials error, device-verify branch), RequireAuth redirect.
- Live smoke (manual, needs URL): script hitting auth + properties + news, run once creds exist.

## 5. Open items for backend team

1. Base URL (dev/staging). 2. CORS or confirmation dev-proxy-only is fine for now + prod domain allowlist later. 3. Test account. 4. News: does `GET /news/` support category filter/sort? (UI hides those controls in real mode if not.) 5. `serviceType` enum values for `POST /payment/` (assumed: `apartment`, `electricity`, `internettv`, `water` — same as finance accountType). 6. NewsArticleSerializer & flat detail exact field lists (adapters written from reference doc; will adjust on first live call).
