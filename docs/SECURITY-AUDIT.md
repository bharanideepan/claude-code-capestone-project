# Security Audit — DevPulse

**Date:** 2026-05-18  
**Auditor:** Claude Sonnet 4.6 (automated review)  
**Scope:** All API routes under `app/api/`, shared utilities in `lib/`, input schemas in `types/index.ts`, and application configuration.

---

## Summary

| Severity | Total | Fixed | Open |
|----------|-------|-------|------|
| HIGH     | 2     | 2     | 0    |
| MEDIUM   | 4     | 2     | 2    |
| LOW      | 2     | 0     | 2    |
| INFO     | 1     | 0     | 1    |

---

## Findings

### [HIGH-1] Missing security headers — all routes

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| File     | `next.config.ts` |
| Line     | 1–7 (original) |
| Status   | **FIXED** |

**Finding:** The application served no security headers. Without `X-Frame-Options`, the dashboard can be embedded in an attacker-controlled iframe (clickjacking). Without `X-Content-Type-Options`, browsers may MIME-sniff responses. Absence of a `Content-Security-Policy` leaves XSS attacks unrestricted once a script injection is achieved.

**Fix applied:** Added a `headers()` export to `next.config.ts` applying the following headers to all routes:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
```

Note: `'unsafe-inline'` and `'unsafe-eval'` are required by Next.js's current runtime. A stricter nonce-based CSP can be adopted once the project migrates to a stable App Router CSP API.

---

### [HIGH-2] No rate limiting on authentication endpoints

| Field    | Detail |
|----------|--------|
| Severity | HIGH |
| File     | `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts` |
| Line     | 5 (original entry point of each) |
| Status   | **FIXED** |

**Finding:** `POST /api/auth/login` and `POST /api/auth/register` had no request-rate controls. An attacker could:
- Brute-force passwords against `POST /login` — bcrypt slows individual checks but sustained automated attempts remain viable at scale.
- Spam `POST /register` to farm accounts or exhaust database resources.

**Fix applied:** Created `lib/rate-limit.ts` — a sliding-window rate limiter backed by an in-process `Map`. Keyed by `x-forwarded-for` IP. Applied limits:

| Endpoint    | Limit | Window    |
|-------------|-------|-----------|
| `POST /login`    | 10 requests | 15 minutes |
| `POST /register` | 5 requests  | 60 minutes |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

**Limitation:** The in-process store does not survive restarts and is not shared across multiple server instances. For multi-instance deployments, replace the `Map` in `lib/rate-limit.ts` with a Redis-backed store (e.g., `upstash/ratelimit`).

---

### [MEDIUM-1] Insufficient input validation on `connectRepoSchema`

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `types/index.ts` |
| Line     | 15–18 (original) |
| Status   | **FIXED** |

**Finding:** `owner` and `name` fields only validated `min(1)`. Attacker-controlled values were forwarded directly to the GitHub API URL (`/repos/{owner}/{name}/...`). While the GitHub API itself rejects invalid inputs, there was no server-side guard against:
- Excessively long strings that could inflate log storage or trigger downstream 4xx errors
- Characters outside GitHub's allowed set (e.g., path-traversal sequences: `../`, URL-encoded characters)

**Fix applied:** Added `max()` and `regex()` validators matching GitHub's documented naming rules:
- `owner`: max 39 chars, regex `^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`
- `name`: max 100 chars, regex `^[a-zA-Z0-9_.-]{1,100}$`

---

### [MEDIUM-2] Missing date-range cap on `GET /api/dashboard/summary`

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `app/api/dashboard/summary/route.ts` |
| Line     | 16 (original, after successful parse) |
| Status   | **FIXED** |

**Finding:** `GET /api/metrics/[repoId]` correctly rejected date ranges exceeding 365 days, but `GET /api/dashboard/summary` had no equivalent guard. A logged-in user could request an unbounded range (e.g., `from=1970-01-01&to=2099-12-31`), causing a full table scan across all metrics rows for all of their repositories.

**Fix applied:** Added the same guard as the metrics route — returns `400 Bad Request` when `from > to` or the range exceeds 365 days.

---

### [MEDIUM-3] Session cookie is readable by JavaScript (not HttpOnly)

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `lib/session-cookie.ts` |
| Line     | 4–6 |
| Status   | **OPEN** |

**Finding:** `setSessionToken()` stores the session token in a client-readable cookie (`document.cookie` without `HttpOnly`). If an XSS vulnerability is ever introduced, an attacker can exfiltrate the session token and hijack the session.

**Recommended fix:** Move session cookie management to the server. The login route should set a `Set-Cookie: devpulse_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...` header, and `requireSession` should read it from the `Cookie` header instead of `Authorization: Bearer`. This is a significant auth architecture change deferred for a follow-up sprint.

---

### [MEDIUM-4] No CORS policy defined

| Field    | Detail |
|----------|--------|
| Severity | MEDIUM |
| File     | `next.config.ts`, all `app/api/` routes |
| Line     | N/A |
| Status   | **OPEN** |

**Finding:** No explicit CORS headers are set. Next.js API routes default to same-origin only for cross-origin requests, which is the safe default. However, there is no explicit policy to confirm this is intentional, and no mechanism to add allowed origins if an external client (e.g., a mobile companion app) is added later.

**Recommended fix:** If the API is intended to remain browser-only (same-origin), add an explicit `Access-Control-Allow-Origin: <none>` or handle `OPTIONS` preflight to reject unknown origins. If a public API is planned, define an allowlist.

---

### [LOW-1] Password has no complexity requirement beyond minimum length

| Field    | Detail |
|----------|--------|
| Severity | LOW |
| File     | `types/index.ts` |
| Line     | 5–7 |
| Status   | **OPEN** |

**Finding:** `registerSchema` requires `min(8)` characters only. Users can register with passwords like `12345678`. NIST 800-63B recommends length ≥ 8 and checking against breach databases rather than mandating complexity, so this is policy-level rather than a hard vulnerability.

**Recommended fix:** Increase minimum to 12 characters and optionally integrate a breach-check API (e.g., Have I Been Pwned) before storing the hash.

---

### [LOW-2] Expired sessions accumulate in the database

| Field    | Detail |
|----------|--------|
| Severity | LOW |
| File     | `lib/auth.ts` |
| Line     | 49–50 |
| Status   | **OPEN** |

**Finding:** Expired sessions are detected and rejected at query time but are never deleted. Over time the `sessions` table will accumulate stale rows for every user who has let their session expire. This is a minor storage leak, not a security vulnerability, but expired tokens sitting in the DB are unnecessary surface area.

**Recommended fix:** Add a periodic cleanup job (e.g., a cron route or a Prisma background task) that runs `DELETE FROM sessions WHERE expires_at < NOW()` on a daily schedule.

---

### [INFO-1] Transitive dependency — PostCSS XSS (CVE moderate)

| Field    | Detail |
|----------|--------|
| Severity | INFO (build-time only) |
| File     | `pnpm-lock.yaml` (transitive via `next > postcss`) |
| Line     | N/A |
| Status   | **OPEN** |

**Finding:** `pnpm audit` reports one moderate-severity finding: PostCSS < 8.5.10 has an XSS vulnerability via unescaped `</style>` in CSS stringify output (GHSA-qx2v-qp2m-jg93). This is a **build-time** dependency — PostCSS processes CSS during `next build` and does not run in the production server. End users are not exposed to this vector.

**Recommended fix:** Wait for Next.js to update its PostCSS peer dependency, or override the version in `package.json`:
```json
"pnpm": {
  "overrides": {
    "postcss": ">=8.5.10"
  }
}
```
This is excluded from CI failure by the `--audit-level=high` flag.

---

## Controls verified as correct

| Control | Location | Status |
|---------|----------|--------|
| SQL injection | All Prisma queries use parameterised statements — no raw SQL | ✓ Safe |
| XSS — reflected | All API responses return `application/json` — no HTML rendering | ✓ Safe |
| Auth on all state-changing routes | Every `POST`/`DELETE` calls `requireSession()` before acting | ✓ Safe |
| IDOR on repo/metrics routes | `repo.userId !== user.id` ownership check before every operation | ✓ Safe |
| Password hashing | bcrypt with cost factor 12 — adequate for current threat model | ✓ Safe |
| Session token entropy | `randomBytes(32).toString('hex')` — 256-bit token, collision-proof | ✓ Safe |
| Hardcoded secrets | No secrets found in source. `.env` is in `.gitignore` | ✓ Safe |
| Internal error leakage | Prisma errors never surfaced to client — generic 500 returned | ✓ Safe |
| Constant-time auth failure | Login returns same message for unknown email and wrong password | ✓ Safe |
