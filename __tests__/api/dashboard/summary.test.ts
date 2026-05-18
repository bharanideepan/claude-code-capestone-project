import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionFindUnique = vi.fn()
const mockRepoFindMany = vi.fn()
const mockMetricFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mockSessionFindUnique, update: vi.fn() },
    repository: { findMany: mockRepoFindMany },
    metric: { findMany: mockMetricFindMany },
  },
}))

const validSession = {
  id: 'sess-1', userId: 'user-1', token: 'valid-token',
  expiresAt: new Date(Date.now() + 86400000),
  user: { id: 'user-1', email: 'alice@example.com' },
}

function authedGet(from = '2026-04-01', to = '2026-04-30') {
  return new Request(`http://localhost/api/dashboard/summary?from=${from}&to=${to}`, {
    headers: { Authorization: 'Bearer valid-token' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/dashboard/summary', () => {
  it('returns 401 when session token is missing', async () => {
    const { GET } = await import('@/app/api/dashboard/summary/route')
    const res = await GET(new Request('http://localhost/api/dashboard/summary?from=2026-04-01&to=2026-04-30'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when date params are missing', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    const { GET } = await import('@/app/api/dashboard/summary/route')
    const res = await GET(
      new Request('http://localhost/api/dashboard/summary', {
        headers: { Authorization: 'Bearer valid-token' },
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 with empty totals when no metrics exist', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindMany.mockResolvedValue([])
    mockMetricFindMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/dashboard/summary/route')
    const res = await GET(authedGet())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totals.commits).toBe(0)
    expect(json.byRepo).toEqual([])
    expect(json.topContributorDays).toEqual([])
  })

  it('returns 200 with aggregated totals and byRepo breakdown', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindMany.mockResolvedValue([
      { id: 'repo-1', fullName: 'octocat/hello-world' },
      { id: 'repo-2', fullName: 'octocat/other' },
    ])
    mockMetricFindMany.mockResolvedValue([
      {
        id: 'm-1', repoId: 'repo-1', date: new Date('2026-04-15'),
        commits: 5, prsOpened: 2, prsMerged: 1, contributors: 3,
        additions: 100, deletions: 20,
      },
      {
        id: 'm-2', repoId: 'repo-1', date: new Date('2026-04-16'),
        commits: 3, prsOpened: 1, prsMerged: 0, contributors: 2,
        additions: 50, deletions: 10,
      },
      {
        id: 'm-3', repoId: 'repo-2', date: new Date('2026-04-15'),
        commits: 2, prsOpened: 0, prsMerged: 1, contributors: 1,
        additions: 30, deletions: 5,
      },
    ])

    const { GET } = await import('@/app/api/dashboard/summary/route')
    const res = await GET(authedGet())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totals.commits).toBe(10)
    expect(json.totals.prsMerged).toBe(2)
    expect(json.totals.additions).toBe(180)

    const repo1 = json.byRepo.find((r: { repoId: string }) => r.repoId === 'repo-1')
    expect(repo1.commits).toBe(8)
    expect(repo1.prsMerged).toBe(1)

    expect(json.topContributorDays[0].date).toBe('2026-04-15')
    expect(json.topContributorDays[0].commits).toBe(7)
  })

  it('returns 200 and includes repo with zero metrics in byRepo', async () => {
    mockSessionFindUnique.mockResolvedValue(validSession)
    mockRepoFindMany.mockResolvedValue([
      { id: 'repo-1', fullName: 'octocat/hello-world' },
      { id: 'repo-2', fullName: 'octocat/quiet' },
    ])
    mockMetricFindMany.mockResolvedValue([
      {
        id: 'm-1', repoId: 'repo-1', date: new Date('2026-04-15'),
        commits: 4, prsOpened: 1, prsMerged: 1, contributors: 2,
        additions: 80, deletions: 10,
      },
    ])

    const { GET } = await import('@/app/api/dashboard/summary/route')
    const res = await GET(authedGet())
    const json = await res.json()

    expect(res.status).toBe(200)
    const repo2 = json.byRepo.find((r: { repoId: string }) => r.repoId === 'repo-2')
    expect(repo2.commits).toBe(0)
    expect(repo2.prsMerged).toBe(0)
  })
})
