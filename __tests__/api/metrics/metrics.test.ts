import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  sessionFindUnique: vi.fn(),
  repoFindUnique: vi.fn(),
  repoFindMany: vi.fn(),
  metricFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mocks.sessionFindUnique },
    repository: { findUnique: mocks.repoFindUnique, findMany: mocks.repoFindMany },
    metric: { findMany: mocks.metricFindMany },
  },
}))

const validSession = {
  id: 'sess-1', userId: 'user-1', token: 'valid-token',
  expiresAt: new Date(Date.now() + 86400000),
  user: { id: 'user-1', email: 'alice@example.com' },
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/metrics/[repoId]', () => {
  it('returns 400 when from date is after to date', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })

    const { GET } = await import('@/app/api/metrics/[repoId]/route')
    const req = new Request('http://localhost/api/metrics/repo-1?from=2026-04-30&to=2026-04-01', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when date range exceeds 365 days', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })

    const { GET } = await import('@/app/api/metrics/[repoId]/route')
    const req = new Request('http://localhost/api/metrics/repo-1?from=2024-01-01&to=2026-01-01', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 403 when user does not own the repo', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'other-user' })

    const { GET } = await import('@/app/api/metrics/[repoId]/route')
    const req = new Request('http://localhost/api/metrics/repo-1?from=2026-04-01&to=2026-04-30', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns empty data array when no metrics exist', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })
    mocks.metricFindMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/metrics/[repoId]/route')
    const req = new Request('http://localhost/api/metrics/repo-1?from=2026-04-01&to=2026-04-30', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual([])
  })

  it('returns daily data with correct shape', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindUnique.mockResolvedValue({ id: 'repo-1', userId: 'user-1' })
    mocks.metricFindMany.mockResolvedValue([
      { date: new Date('2026-04-01'), commits: 5, prsOpened: 2, prsMerged: 1, prsClosed: 0, contributors: 3, additions: 100, deletions: 20 },
    ])

    const { GET } = await import('@/app/api/metrics/[repoId]/route')
    const req = new Request('http://localhost/api/metrics/repo-1?from=2026-04-01&to=2026-04-30', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req, { params: Promise.resolve({ repoId: 'repo-1' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data[0].commits).toBe(5)
    expect(json.granularity).toBe('day')
  })
})

describe('GET /api/dashboard/summary', () => {
  it('returns 400 when from param is missing', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)

    const { GET } = await import('@/app/api/dashboard/summary/route')
    const req = new Request('http://localhost/api/dashboard/summary?to=2026-04-30', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with zero totals when user has no repos', async () => {
    mocks.sessionFindUnique.mockResolvedValue(validSession)
    mocks.repoFindMany.mockResolvedValue([])
    mocks.metricFindMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/dashboard/summary/route')
    const req = new Request('http://localhost/api/dashboard/summary?from=2026-04-01&to=2026-04-30', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totals.commits).toBe(0)
  })
})
