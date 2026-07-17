#!/usr/bin/env node
// Live smoke test against a REAL backend. Manual/opt-in only (`bun run
// smoke`) — never run in CI or vitest, and deliberately plain Node (no
// vitest, no Vite, no import.meta.env) so it can be run standalone once a
// staging URL + test account exist (docs/specs/2026-07-16-backend-integration-design.md
// §4 "Live smoke").
//
// Checks, in order: (1) POST /mobileApi/auth/ for tokens — a code:-2
// (device verification pending) response still issues tokens under `result`,
// and the data endpoints work with them (confirmed live, Task L1), so it
// prints a WARN and PROCEEDS instead of aborting; (2) GET
// /mobileApi/properties/v2/ (complexes -> flattened flats); (3) GET
// /mobileApi/news/ page 1; (4) GET /mobileApi/tickets/ (+ /tickets/subject/,
// which the real adaptTicketList needs); (5) GET /mobileApi/internettv/tariff/.
// Each prints OK/FAIL, the HTTP status, and the first item run through the
// SAME adapters src/api/adapters/*.js uses in the app, so a shape mismatch
// between a real payload and our guessed DTO fields (see the FLAG comments
// throughout adapters/) shows up here before it shows up in the UI.
//
// Credentials/tokens are never printed — only whether they're present.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { parseEnvFile } from '../src/utils/envFile.js'
import { parseEnvelope, ApiError } from '../src/api/errors.js'
import { adaptProperty } from '../src/api/adapters/apartments.js'
import { adaptNewsList } from '../src/api/adapters/news.js'
import { adaptTicketList, adaptSubjects } from '../src/api/adapters/support.js'
import { adaptTariffs } from '../src/api/adapters/internet.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readEnvFile(name) {
  try {
    return parseEnvFile(readFileSync(path.join(ROOT, name), 'utf8'))
  } catch {
    return {} // missing file is fine — .env.local in particular usually only exists locally
  }
}

// Precedence low -> high: .env, .env.local, real process.env — the same
// order Vite itself applies, so `bun run smoke` reads whatever `bun run dev`
// would.
const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local'), ...process.env }

const API_BASE = env.VITE_API_BASE
const TEST_USER = env.VITE_TEST_USER
const TEST_PASS = env.VITE_TEST_PASS

function refuse(message) {
  console.error(`\nCannot run live smoke test: ${message}\n`)
  process.exit(1)
}

if (!API_BASE) {
  refuse(
    'VITE_API_BASE is not set. Set it in .env.local, .env, or the environment ' +
      '(see README "Backend integration" for the live-smoke setup).'
  )
}
if (!TEST_USER || !TEST_PASS) {
  refuse(
    'VITE_TEST_USER and/or VITE_TEST_PASS are not set. Add them to .env.local ' +
      '(gitignored — never commit real credentials) before running `bun run smoke`.'
  )
}

console.log('Live smoke test')
console.log(`  API base:  ${API_BASE}`)
console.log(`  Test user: ${TEST_USER ? 'present' : 'MISSING'}`)
console.log(`  Test pass: ${TEST_PASS ? 'present' : 'MISSING'}`)

let failures = 0

function report(name, ok, status, detail) {
  const line = `${ok ? 'OK  ' : 'FAIL'} ${name} (status ${status})`
  console.log(`\n${line}`)
  if (detail !== undefined) {
    const label = ok ? 'first adapted item' : 'error'
    console.log(`  ${label}: ${JSON.stringify(detail, null, 2).split('\n').join('\n  ')}`)
  }
  if (!ok) failures += 1
}

// Authenticated GET, parsed through the same {code,msg,result} envelope
// http() uses (src/api/errors.js's parseEnvelope) — reused here rather than
// reimplemented so a mismatch between this script's expectations and the
// app's real parsing can't silently diverge.
async function apiGet(pathname, access) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  if (!res.ok && !(json && typeof json.code === 'number')) {
    throw new Error(`HTTP ${res.status}`)
  }
  return { status: res.status, result: parseEnvelope(json ?? {}) }
}

async function login() {
  let res
  let json
  try {
    res = await fetch(`${API_BASE}/mobileApi/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
    })
    json = await res.json()
  } catch (err) {
    report('auth', false, 'ERR', err.message)
    return null
  }

  if (json.code === -2) {
    // Device verification pending — but tokens ARE issued under `result`
    // and the data endpoints accept them (confirmed live), so warn and
    // proceed rather than aborting the run.
    const access = json.result?.access
    if (!access) {
      report('auth', false, res.status, 'code -2 (device verify pending) with no access token in result')
      return null
    }
    console.log(`\nWARN auth (status ${res.status}) device-verify-pending — proceeding with issued tokens`)
    console.log(
      '  This test account has a pending device-verification step; data\n' +
        '  endpoints still work with the issued tokens, so the checks below run\n' +
        '  anyway. Complete verification via the app to clear this warning.'
    )
    return access
  }
  if (typeof json.code === 'number' && json.code < 0) {
    report('auth', false, res.status, undefined)
    console.log(`  ${json.msg || 'login failed'}${json.error ? ` (${json.error})` : ''}`)
    return null
  }
  if (!res.ok || !json.access) {
    report('auth', false, res.status, undefined)
    return null
  }
  report('auth', true, res.status, { access: 'present', refresh: json.refresh ? 'present' : 'missing' })
  return json.access
}

async function checkProperties(access) {
  try {
    const { status, result } = await apiGet('/mobileApi/properties/v2/', access)
    // /properties/v2/ returns COMPLEXES [{id, name, flats: []}] — flatten to
    // flats the same way endpoints/apartments.js does before adapting.
    const flats = (result || []).flatMap((c) => (c.flats || []).map((flat) => ({ complex: c.name, ...flat })))
    report('properties/v2', true, status, flats.length ? adaptProperty(flats[0]) : null)
  } catch (err) {
    report('properties/v2', false, err instanceof ApiError ? err.code : 'ERR', err.message)
  }
}

async function checkNews(access) {
  try {
    const { status, result } = await apiGet('/mobileApi/news/?page=1', access)
    const adapted = adaptNewsList(result || {})
    report('news (page 1)', true, status, adapted.items[0] ?? null)
  } catch (err) {
    report('news (page 1)', false, err instanceof ApiError ? err.code : 'ERR', err.message)
  }
}

async function checkTickets(access) {
  try {
    const [{ status, result }, subjectsRes] = await Promise.all([
      apiGet('/mobileApi/tickets/', access),
      apiGet('/mobileApi/tickets/subject/', access),
    ])
    const subjects = adaptSubjects(subjectsRes.result || [])
    const list = adaptTicketList(result || {}, subjects)
    report('tickets', true, status, list[0] ?? null)
  } catch (err) {
    report('tickets', false, err instanceof ApiError ? err.code : 'ERR', err.message)
  }
}

async function checkInternetTariff(access) {
  try {
    const { status, result } = await apiGet('/mobileApi/internettv/tariff/', access)
    const adapted = adaptTariffs(result || {})
    report('internettv/tariff', true, status, adapted.plans[0] ?? adapted.boosts[0] ?? null)
  } catch (err) {
    report('internettv/tariff', false, err instanceof ApiError ? err.code : 'ERR', err.message)
  }
}

const access = await login()
if (access) {
  await checkProperties(access)
  await checkNews(access)
  await checkTickets(access)
  await checkInternetTariff(access)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`)
process.exit(failures === 0 ? 0 : 1)
