import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRepoInfo,
  fetchCommitsByDateRange,
  fetchPRsByDateRange,
  GitHubRepoNotFoundError,
  GitHubRateLimitError,
  GitHubUnavailableError,
} from '@/lib/github'

// Mock global fetch so tests never hit the real GitHub API
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getRepoInfo', () => {
  it('returns repo info when GitHub responds with 200', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        id: 12345,
        owner: { login: 'octocat' },
        name: 'hello-world',
        full_name: 'octocat/hello-world',
        description: 'My first repo',
        private: false,
        default_branch: 'main',
      }),
    )
    const info = await getRepoInfo('octocat', 'hello-world')
    expect(info.githubId).toBe(12345)
    expect(info.fullName).toBe('octocat/hello-world')
    expect(info.isPrivate).toBe(false)
    expect(info.defaultBranch).toBe('main')
  })

  it('throws GitHubRepoNotFoundError on 404', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404))
    await expect(getRepoInfo('octocat', 'missing')).rejects.toBeInstanceOf(GitHubRepoNotFoundError)
  })

  it('throws GitHubRateLimitError on 429', async () => {
    const res = new Response(JSON.stringify({ message: 'rate limit' }), {
      status: 429,
      headers: { 'Retry-After': '30' },
    })
    mockFetch.mockResolvedValue(res)
    const err = await getRepoInfo('octocat', 'hello-world').catch((e) => e)
    expect(err).toBeInstanceOf(GitHubRateLimitError)
    expect((err as GitHubRateLimitError).retryAfter).toBe(30)
  })

  it('throws GitHubUnavailableError on network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await expect(getRepoInfo('octocat', 'hello-world')).rejects.toBeInstanceOf(GitHubUnavailableError)
  })
})

describe('fetchCommitsByDateRange', () => {
  it('returns daily commit counts grouped by date', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        { commit: { author: { date: '2026-04-15T10:00:00Z' } } },
        { commit: { author: { date: '2026-04-15T14:00:00Z' } } },
        { commit: { author: { date: '2026-04-16T09:00:00Z' } } },
      ]),
    )
    const result = await fetchCommitsByDateRange('octocat', 'hello-world', 'main', '2026-04-15', '2026-04-16')
    expect(result).toHaveLength(2)
    const april15 = result.find((r) => r.date === '2026-04-15')
    expect(april15?.count).toBe(2)
    const april16 = result.find((r) => r.date === '2026-04-16')
    expect(april16?.count).toBe(1)
  })

  it('returns empty array when no commits exist', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    const result = await fetchCommitsByDateRange('octocat', 'hello-world', 'main', '2026-04-01', '2026-04-30')
    expect(result).toEqual([])
  })

  it('returns empty array on 404', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404))
    const result = await fetchCommitsByDateRange('octocat', 'empty', 'main', '2026-04-01', '2026-04-30')
    expect(result).toEqual([])
  })
})

describe('fetchPRsByDateRange', () => {
  it('returns daily PR counts grouped by date', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse([
        { created_at: '2026-04-15T10:00:00Z', merged_at: null, closed_at: null, state: 'open' },
        { created_at: '2026-04-15T12:00:00Z', merged_at: '2026-04-16T10:00:00Z', closed_at: '2026-04-16T10:00:00Z', state: 'closed' },
        { created_at: '2026-04-16T09:00:00Z', merged_at: null, closed_at: '2026-04-17T09:00:00Z', state: 'closed' },
      ]),
    )
    const result = await fetchPRsByDateRange('octocat', 'hello-world', '2026-04-15', '2026-04-17')
    const april15 = result.find((r) => r.date === '2026-04-15')
    expect(april15?.opened).toBe(2)
    const april16 = result.find((r) => r.date === '2026-04-16')
    expect(april16?.merged).toBe(1)
  })

  it('returns empty array when no PRs exist', async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    const result = await fetchPRsByDateRange('octocat', 'hello-world', '2026-04-01', '2026-04-30')
    expect(result).toEqual([])
  })
})
