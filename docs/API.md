# DevPulse API Reference

Base URL: `http://localhost:3000/api` (development) / `https://<your-domain>/api` (production)

All endpoints return JSON. All state-changing routes require authentication.

---

## Authentication

DevPulse uses bearer token authentication. After a successful login, include the token on every request:

```
Authorization: Bearer <token>
```

Sessions have a **30-day sliding expiry** — the expiry resets on every authenticated request.

---

## Auth Endpoints

### Register

```
POST /api/auth/register
```

Create a new user account.

**Rate limit:** 5 requests per hour per IP.

**Request body**

```json
{
  "email": "dev@example.com",
  "password": "mysecretpassword"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | string | Valid email format |
| `password` | string | Minimum 8 characters |

**Response 201**

```json
{
  "user": {
    "id": "clxyz123",
    "email": "dev@example.com",
    "createdAt": "2026-05-18T10:00:00.000Z"
  }
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Invalid email address" }` | Validation failure |
| 409 | `{ "error": "An account with this email already exists" }` | Duplicate email |
| 429 | `{ "error": "Too many registration attempts. Please try again later." }` | Rate limit exceeded |

---

### Login

```
POST /api/auth/login
```

Authenticate and receive a session token.

**Rate limit:** 10 requests per 15 minutes per IP.

**Request body**

```json
{
  "email": "dev@example.com",
  "password": "mysecretpassword"
}
```

**Response 200**

```json
{
  "token": "a3f8c2e1d4b5...",
  "expiresAt": "2026-06-17T10:00:00.000Z",
  "user": {
    "id": "clxyz123",
    "email": "dev@example.com"
  }
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Invalid email address" }` | Validation failure |
| 401 | `{ "error": "Invalid email or password" }` | Unknown email or wrong password (same message intentionally) |
| 429 | `{ "error": "Too many login attempts. Please try again later." }` | Rate limit exceeded |

---

### Logout

```
POST /api/auth/logout
```

Invalidate the current session token.

**Auth required:** Yes

**Request body:** None

**Response 200**

```json
{ "success": true }
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Missing authorization token" }` | No token provided |
| 401 | `{ "error": "Invalid session token" }` | Token not found |
| 401 | `{ "error": "Session expired" }` | Token expired |

---

### Get Current Session

```
GET /api/auth/session
```

Verify the current token and retrieve the authenticated user.

**Auth required:** Yes

**Response 200**

```json
{
  "user": {
    "id": "clxyz123",
    "email": "dev@example.com"
  },
  "session": {
    "expiresAt": "2026-06-17T10:00:00.000Z"
  }
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Missing authorization token" }` | No `Authorization` header |
| 401 | `{ "error": "Session expired" }` | Token is past its expiry |

---

## Repository Endpoints

### List Repositories

```
GET /api/repos
```

Return all repositories connected by the authenticated user.

**Auth required:** Yes

**Response 200**

```json
{
  "repositories": [
    {
      "id": "repo_abc",
      "githubId": 12345678,
      "owner": "acme-corp",
      "name": "backend-api",
      "fullName": "acme-corp/backend-api",
      "description": "Our main backend service",
      "isPrivate": false,
      "defaultBranch": "main",
      "userId": "clxyz123",
      "syncStatus": "SUCCESS",
      "lastSyncedAt": "2026-05-18T09:00:00.000Z",
      "createdAt": "2026-05-01T00:00:00.000Z",
      "updatedAt": "2026-05-18T09:00:00.000Z"
    }
  ]
}
```

`syncStatus` values: `PENDING` | `SYNCING` | `SUCCESS` | `FAILED`

---

### Connect a Repository

```
POST /api/repos/connect
```

Register a GitHub repository and verify it exists via the GitHub API.

**Auth required:** Yes

**Request body**

```json
{
  "owner": "acme-corp",
  "name": "backend-api"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `owner` | string | 1–39 chars, alphanumeric + hyphens (GitHub owner rules) |
| `name` | string | 1–100 chars, alphanumeric + hyphens + underscores + dots |

**Response 201**

```json
{
  "repository": {
    "id": "repo_abc",
    "fullName": "acme-corp/backend-api",
    "syncStatus": "PENDING"
  }
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Owner contains invalid characters" }` | Validation failure |
| 401 | `{ "error": "Missing authorization token" }` | Not authenticated |
| 404 | `{ "error": "Repository not found on GitHub" }` | Repo does not exist or token lacks access |
| 409 | `{ "error": "Repository is already connected" }` | Duplicate |
| 502 | `{ "error": "GitHub is currently unreachable" }` | GitHub API down |

---

### Disconnect a Repository

```
DELETE /api/repos/[repoId]
```

Remove a repository and all its metrics data (cascades).

**Auth required:** Yes

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `repoId` | The DevPulse repository ID (from `/api/repos`) |

**Response 200**

```json
{ "success": true }
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Missing authorization token" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Repo belongs to another user |
| 404 | `{ "error": "Repository not found" }` | Unknown repo ID |

---

### Sync Repository Metrics

```
POST /api/repos/[repoId]/sync
```

Fetch commits and pull requests from GitHub and upsert daily `Metric` rows. Syncs from `lastSyncedAt` (or 90 days ago for a first sync) to today.

**Auth required:** Yes

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `repoId` | The DevPulse repository ID |

**Request body:** None

**Response 200**

```json
{
  "repository": {
    "id": "repo_abc",
    "syncStatus": "SUCCESS",
    "lastSyncedAt": "2026-05-18T10:00:00.000Z"
  }
}
```

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 401 | `{ "error": "Missing authorization token" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Repo belongs to another user |
| 404 | `{ "error": "Repository not found" }` | Unknown repo ID |
| 429 | `{ "error": "GitHub rate limit exceeded" }` + `Retry-After` header | GitHub rate limited |
| 500 | `{ "error": "Internal server error" }` | Unexpected failure (repo `syncStatus` set to `FAILED`) |
| 502 | `{ "error": "GitHub is currently unreachable" }` | GitHub API down |

---

## Metrics Endpoints

### Get Repository Metrics

```
GET /api/metrics/[repoId]?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day
```

Return daily metric rows for a single repository within the given date range.

**Auth required:** Yes

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `repoId` | The DevPulse repository ID |

**Query parameters**

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `from` | `YYYY-MM-DD` | Yes | — | Must be ≤ `to` |
| `to` | `YYYY-MM-DD` | Yes | — | Must be ≥ `from` |
| `granularity` | `day` \| `week` \| `month` | No | `day` | Data is always daily; this param is stored for future aggregation support |

Maximum range: **365 days**.

**Response 200**

```json
{
  "repoId": "repo_abc",
  "from": "2026-04-18",
  "to": "2026-05-18",
  "granularity": "day",
  "data": [
    {
      "date": "2026-04-18",
      "commits": 4,
      "prsOpened": 1,
      "prsMerged": 0,
      "prsClosed": 0,
      "contributors": 2,
      "additions": 0,
      "deletions": 0
    },
    {
      "date": "2026-04-19",
      "commits": 7,
      "prsOpened": 0,
      "prsMerged": 1,
      "prsClosed": 0,
      "contributors": 3,
      "additions": 0,
      "deletions": 0
    }
  ]
}
```

> Note: `additions` and `deletions` are currently synced as `0`. The GitHub Commits API requires one additional request per commit to retrieve diff stats; this is deferred to avoid N+1 API calls during sync.

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Invalid from date (use YYYY-MM-DD)" }` | Bad date format |
| 400 | `{ "error": "from must be before to" }` | Invalid range |
| 400 | `{ "error": "Date range cannot exceed 365 days" }` | Range too wide |
| 401 | `{ "error": "Missing authorization token" }` | Not authenticated |
| 403 | `{ "error": "Forbidden" }` | Repo belongs to another user |
| 404 | `{ "error": "Repository not found" }` | Unknown repo ID |

---

## Dashboard Endpoints

### Get Dashboard Summary

```
GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Aggregate metrics across **all** repositories connected by the authenticated user.

**Auth required:** Yes

**Query parameters**

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `from` | `YYYY-MM-DD` | Yes | Must be ≤ `to` |
| `to` | `YYYY-MM-DD` | Yes | Must be ≥ `from` |

Maximum range: **365 days**.

**Response 200**

```json
{
  "from": "2026-04-18",
  "to": "2026-05-18",
  "totals": {
    "commits": 312,
    "prsOpened": 47,
    "prsMerged": 39,
    "contributors": 8,
    "additions": 0,
    "deletions": 0
  },
  "byRepo": [
    {
      "repoId": "repo_abc",
      "fullName": "acme-corp/backend-api",
      "commits": 180,
      "prsMerged": 22
    },
    {
      "repoId": "repo_def",
      "fullName": "acme-corp/frontend",
      "commits": 132,
      "prsMerged": 17
    }
  ],
  "topContributorDays": [
    { "date": "2026-05-12", "commits": 18 },
    { "date": "2026-05-05", "commits": 15 }
  ]
}
```

`topContributorDays` lists the 10 highest-commit days across all repos, sorted descending.

**Error responses**

| Status | Body | Reason |
|--------|------|--------|
| 400 | `{ "error": "Invalid from date (use YYYY-MM-DD)" }` | Bad date format |
| 400 | `{ "error": "from must be before to" }` | Invalid range |
| 400 | `{ "error": "Date range cannot exceed 365 days" }` | Range too wide |
| 401 | `{ "error": "Missing authorization token" }` | Not authenticated |

---

## Common Patterns

### Error response shape

All errors use a consistent envelope:

```json
{ "error": "<human-readable message>" }
```

### Authentication errors

All protected routes return the same auth error shapes regardless of whether the resource exists. This prevents user enumeration.

### 429 with Retry-After

When rate limits are hit (auth endpoints or GitHub rate limit pass-through), the response includes a `Retry-After` header with seconds to wait:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 847
Content-Type: application/json

{ "error": "Too many login attempts. Please try again later." }
```

### Date format

All dates in query parameters use `YYYY-MM-DD` (ISO 8601 date). All timestamps in response bodies use `YYYY-MM-DDTHH:mm:ss.sssZ` (ISO 8601 with UTC timezone).
