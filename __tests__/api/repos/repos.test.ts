import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRepoFindMany = vi.fn()
const mockRepoFindUnique = vi.fn()
const mockRepoCreate = vi.fn()
const mockRepoDelete = vi.fn()
const mockRepoUpdate = vi.fn()
const mockSessionFindUnique = vi.fn()
const mockMetricDeleteMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mockSessionFindUnique, update: vi.fn() },
    repository: {
      findMany: mockRepoFindMany,
      findUnique: mockRepoFindUnique,
      create: mockRepoCreate,
      delete: mockRepoDelete,
      update: mockRepoUpdate,
    },
    metric: { deleteMany: mockMetricDeleteMany },
  },
}))

// Mock github lib — include error classes so instanceof checks work in route handlers
vi.mock('@/lib/github', () => {
  class GitHubRepoNotFoundError extends Error { constructor(m: string) { super(m); this.name = 'GitHubRepoNotFoundError' } }
  class GitHubUnavailableError extends Error { constructor(m: string) { super(m); this.name = 'GitHubUnavailableError' } }
  class GitHubRateLimitError extends Error { retryAfter: number; constructor(m: string, r: number) { super(m); this.name = 'GitHubRateLimitError'; this.retryAfter = r } }
  return { getRepoInfo: vi.fn(), GitHubRepoNotFoundError, GitHubUnavailableError, GitHubRateLimitError }
})

const validSession = {
  id: 'sess-1', userId: 'user-1', token: 'valid-token',
  expiresAt: new Date(Date.now() + 86400000),
  user: { id: 'user-1', email: 'alice@example.com' },
}

const authedReq = (method = 'GET', body?: unknown) =>
  new Request('http://localhost/api/repos', {
    method,
    headers: {
      Authorization: 'Bearer valid-token',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

beforeEach(() => vi.clearAllMocks())

// ── GET /api/repos ──────────────────────────────────────────────────────────

describe('GET /api/repos', () => {
  it('returns 401 when session token is missing', async () => {
    const { GET } = await import('@/app/api/repos/route')
    const res = await GET(new Request('http://localhost/api/repos'))
    expect(res.status).toBe(401)
  })

  it('returns empty array when user has no repos', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/repos/route')
    const res = await GET(authedReq())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.repositories).toEqual([])
  })

  it('returns only repos belonging to the authenticated user', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindMany.mockResolvedValue([
      { id: 'repo-1', fullName: 'user-1/repo', userId: 'user-1', syncStatus: 'SUCCESS', lastSyncedAt: null },
    ])

    const { GET } = await import('@/app/api/repos/route')
    const res = await GET(authedReq())
    const json = await res.json()

    expect(json.repositories).toHaveLength(1)
    expect(mockRepoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    )
  })
})

// ── POST /api/repos/connect ──────────────────────────────────────────────────

describe('POST /api/repos/connect', () => {
  it('returns 400 when owner field is missing', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)

    const { POST } = await import('@/app/api/repos/connect/route')
    const req = new Request('http://localhost/api/repos/connect', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'hello-world' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when repo is already connected', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })

    const { POST } = await import('@/app/api/repos/connect/route')
    const req = new Request('http://localhost/api/repos/connect', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: 'octocat', name: 'hello-world' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 404 when GitHub repo is not found', async () => {
    const { getRepoInfo } = await import('@/lib/github')
    const { GitHubRepoNotFoundError } = await import('@/lib/github')
    vi.mocked(getRepoInfo).mockRejectedValue(new GitHubRepoNotFoundError('Not found'))

    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/repos/connect/route')
    const req = new Request('http://localhost/api/repos/connect', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: 'ghost', name: 'nonexistent' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/repos/[repoId] ───────────────────────────────────────────────

describe('DELETE /api/repos/[repoId]', () => {
  it('returns 200 and deletes when user owns the repo', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })
    mockRepoDelete.mockResolvedValue({})

    const { DELETE } = await import('@/app/api/repos/[repoId]/route')
    const req = new Request('http://localhost/api/repos/repo-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await DELETE(req, { params: Promise.resolve({ repoId: 'repo-1' }) })

    expect(res.status).toBe(200)
    expect(mockRepoDelete).toHaveBeenCalledWith({ where: { id: 'repo-1' } })
  })

  it('returns 403 when repo belongs to a different user', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'other-user' })

    const { DELETE } = await import('@/app/api/repos/[repoId]/route')
    const req = new Request('http://localhost/api/repos/repo-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await DELETE(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 when repo does not exist', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/repos/[repoId]/route')
    const req = new Request('http://localhost/api/repos/nonexistent', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await DELETE(req, { params: Promise.resolve({ repoId: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})
