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

// Placeholder — real implementation wires to GitHub MCP in Layer 3
export async function getRepoInfo(_owner: string, _name: string): Promise<GitHubRepoInfo> {
  throw new GitHubUnavailableError('GitHub MCP not yet configured')
}

export async function fetchCommitsByDateRange(
  _owner: string,
  _name: string,
  _branch: string,
  _from: string,
  _to: string,
): Promise<DailyCommits[]> {
  return []
}

export async function fetchPRsByDateRange(
  _owner: string,
  _name: string,
  _from: string,
  _to: string,
): Promise<DailyPRs[]> {
  return []
}
