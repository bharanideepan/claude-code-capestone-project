const GITHUB_API = 'https://api.github.com'

export class GitHubRepoNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubRepoNotFoundError'
  }
}

export class GitHubUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubUnavailableError'
  }
}

export class GitHubRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number,
  ) {
    super(message)
    this.name = 'GitHubRateLimitError'
  }
}

export type GitHubRepoInfo = {
  githubId: number
  owner: string
  name: string
  fullName: string
  description: string | null
  isPrivate: boolean
  defaultBranch: string
}

export type DailyCommits = {
  date: string
  count: number
  additions: number
  deletions: number
}

export type DailyPRs = {
  date: string
  opened: number
  merged: number
  closed: number
}

function buildHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function ghFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, { headers: buildHeaders() })
  } catch {
    throw new GitHubUnavailableError('GitHub is currently unreachable')
  }
}

function handleRateLimit(res: Response): never {
  const retryAfter = Number(res.headers.get('Retry-After') ?? 60)
  throw new GitHubRateLimitError('GitHub rate limit exceeded', retryAfter)
}

export async function getRepoInfo(owner: string, name: string): Promise<GitHubRepoInfo> {
  const res = await ghFetch(`${GITHUB_API}/repos/${owner}/${name}`)
  if (res.status === 404) throw new GitHubRepoNotFoundError(`Repository ${owner}/${name} not found on GitHub`)
  if (res.status === 429) handleRateLimit(res)
  if (!res.ok) throw new GitHubUnavailableError(`GitHub returned unexpected status ${res.status}`)

  const data = await res.json()
  return {
    githubId: data.id as number,
    owner: (data.owner as { login: string }).login,
    name: data.name as string,
    fullName: data.full_name as string,
    description: (data.description as string | null) ?? null,
    isPrivate: data.private as boolean,
    defaultBranch: data.default_branch as string,
  }
}

export async function fetchCommitsByDateRange(
  owner: string,
  name: string,
  branch: string,
  from: string,
  to: string,
): Promise<DailyCommits[]> {
  const params = new URLSearchParams({
    sha: branch,
    since: `${from}T00:00:00Z`,
    until: `${to}T23:59:59Z`,
    per_page: '100',
  })
  const res = await ghFetch(`${GITHUB_API}/repos/${owner}/${name}/commits?${params}`)
  if (res.status === 404) return []
  if (res.status === 429) handleRateLimit(res)
  if (!res.ok) throw new GitHubUnavailableError(`GitHub returned unexpected status ${res.status}`)

  const commits = (await res.json()) as Array<{ commit: { author: { date: string } } }>

  const byDay = new Map<string, number>()
  for (const c of commits) {
    const date = c.commit.author.date.slice(0, 10)
    byDay.set(date, (byDay.get(date) ?? 0) + 1)
  }

  return Array.from(byDay.entries()).map(([date, count]) => ({
    date,
    count,
    // Per-commit additions/deletions require N+1 requests; synced as 0
    additions: 0,
    deletions: 0,
  }))
}

export async function fetchPRsByDateRange(
  owner: string,
  name: string,
  from: string,
  to: string,
): Promise<DailyPRs[]> {
  const params = new URLSearchParams({
    state: 'all',
    sort: 'created',
    direction: 'desc',
    per_page: '100',
  })
  const res = await ghFetch(`${GITHUB_API}/repos/${owner}/${name}/pulls?${params}`)
  if (res.status === 404) return []
  if (res.status === 429) handleRateLimit(res)
  if (!res.ok) throw new GitHubUnavailableError(`GitHub returned unexpected status ${res.status}`)

  const prs = (await res.json()) as Array<{
    created_at: string
    merged_at: string | null
    closed_at: string | null
    state: string
  }>

  const fromDate = new Date(from)
  const toDate = new Date(`${to}T23:59:59Z`)

  const byDay = new Map<string, { opened: number; merged: number; closed: number }>()

  function ensure(date: string) {
    if (!byDay.has(date)) byDay.set(date, { opened: 0, merged: 0, closed: 0 })
    return byDay.get(date)!
  }

  for (const pr of prs) {
    const createdAt = new Date(pr.created_at)
    if (createdAt >= fromDate && createdAt <= toDate) {
      ensure(pr.created_at.slice(0, 10)).opened++
    }
    if (pr.merged_at) {
      const mergedAt = new Date(pr.merged_at)
      if (mergedAt >= fromDate && mergedAt <= toDate) {
        ensure(pr.merged_at.slice(0, 10)).merged++
      }
    }
    if (pr.closed_at && pr.state === 'closed' && !pr.merged_at) {
      const closedAt = new Date(pr.closed_at)
      if (closedAt >= fromDate && closedAt <= toDate) {
        ensure(pr.closed_at.slice(0, 10)).closed++
      }
    }
  }

  return Array.from(byDay.entries()).map(([date, counts]) => ({ date, ...counts }))
}
