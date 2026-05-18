import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionFindUnique = vi.fn()
const mockSessionUpdate = vi.fn()
const mockRepoFindUnique = vi.fn()
const mockRepoUpdate = vi.fn()
const mockMetricUpsert = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mockSessionFindUnique, update: mockSessionUpdate },
    repository: { findUnique: mockRepoFindUnique, update: mockRepoUpdate },
    metric: { upsert: mockMetricUpsert },
  },
}))

vi.mock('@/lib/github', () => {
  class GitHubRateLimitError extends Error {
    retryAfter: number
    constructor(m: string, r: number) { super(m); this.name = 'GitHubRateLimitError'; this.retryAfter = r }
  }
  class GitHubUnavailableError extends Error {
    constructor(m: string) { super(m); this.name = 'GitHubUnavailableError' }
  }
  return {
    fetchCommitsByDateRange: vi.fn(),
    fetchPRsByDateRange: vi.fn(),
    GitHubRateLimitError,
    GitHubUnavailableError,
  }
})

const validSession = {
  id: 'sess-1', userId: 'user-1', token: 'valid-token',
  expiresAt: new Date(Date.now() + 86400000),
  user: { id: 'user-1', email: 'alice@example.com' },
}

const validRepo = {
  id: 'repo-1', userId: 'user-1', owner: 'octocat', name: 'hello-world',
  defaultBranch: 'main', lastSyncedAt: null,
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/repos/[repoId]/sync', () => {
  it('returns 401 when session token is missing', async () => {
    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', { method: 'POST' }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when repo does not exist', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when repo belongs to a different user', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue({ ...validRepo, userId: 'other-user' })

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 with SUCCESS status after syncing commits and PRs', async () => {
    const { fetchCommitsByDateRange, fetchPRsByDateRange } = await import('@/lib/github')
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(validRepo)
    mockRepoUpdate.mockResolvedValue({ id: 'repo-1', syncStatus: 'SUCCESS', lastSyncedAt: new Date() })
    mockMetricUpsert.mockResolvedValue({})
    vi.mocked(fetchCommitsByDateRange).mockResolvedValue([
      { date: '2026-04-15', count: 3, additions: 0, deletions: 0 },
    ])
    vi.mocked(fetchPRsByDateRange).mockResolvedValue([
      { date: '2026-04-15', opened: 1, merged: 0, closed: 0 },
    ])

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.repository.syncStatus).toBe('SUCCESS')
    expect(mockMetricUpsert).toHaveBeenCalledOnce()
  })

  it('returns 200 with empty metrics when GitHub returns no commits', async () => {
    const { fetchCommitsByDateRange, fetchPRsByDateRange } = await import('@/lib/github')
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(validRepo)
    mockRepoUpdate.mockResolvedValue({ id: 'repo-1', syncStatus: 'SUCCESS', lastSyncedAt: new Date() })
    vi.mocked(fetchCommitsByDateRange).mockResolvedValue([])
    vi.mocked(fetchPRsByDateRange).mockResolvedValue([])

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(200)
    expect(mockMetricUpsert).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After header when GitHub rate limits', async () => {
    const { fetchCommitsByDateRange, GitHubRateLimitError } = await import('@/lib/github')
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(validRepo)
    mockRepoUpdate.mockResolvedValue({})
    vi.mocked(fetchCommitsByDateRange).mockRejectedValue(new GitHubRateLimitError('rate limit', 60))

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('returns 502 when GitHub is unreachable', async () => {
    const { fetchCommitsByDateRange, GitHubUnavailableError } = await import('@/lib/github')
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindUnique.mockResolvedValue(validRepo)
    mockRepoUpdate.mockResolvedValue({})
    vi.mocked(fetchCommitsByDateRange).mockRejectedValue(new GitHubUnavailableError('unreachable'))

    const { POST } = await import('@/app/api/repos/[repoId]/sync/route')
    const res = await POST(
      new Request('http://localhost/api/repos/repo-1/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ repoId: 'repo-1' }) },
    )
    expect(res.status).toBe(502)
  })
})
