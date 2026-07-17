// Pure `.env`-style line parser. Used by scripts/live-smoke.mjs so the live
// smoke script can read VITE_API_BASE / VITE_TEST_USER / VITE_TEST_PASS from
// .env.local / .env without a `dotenv` dependency — a plain function with no
// import.meta/Vite/Node-fs dependency of its own, so it's trivially unit
// testable and works the same whether called from Vite or a bare `node`
// process.
//
// Supports `KEY=VALUE` lines, blank lines, `#`-comments (whole-line only),
// and optional single/double-quoted values (quotes are stripped). Malformed
// lines (no `=`) and lines with an empty key are silently skipped rather
// than throwing, since env files are hand-edited and often have stray
// content. Later `KEY=` lines win over earlier ones for the same key,
// matching normal shell/dotenv semantics.
export function parseEnvFile(text) {
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    if (!key) continue

    let value = line.slice(eq + 1).trim()
    if (value.length >= 2) {
      const first = value[0]
      const last = value[value.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1)
      }
    }
    out[key] = value
  }
  return out
}
