import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { errorResponse } from '@/types/index'
import {
  fetchCommitsByDateRange,
  fetchPRsByDateRange,
  GitHubRateLimitError,
  GitHubUnavailableError,
} from '@/lib/github'
import { SyncStatus } from '@prisma/client'

type Params = { params: Promise<{ repoId: string }> }

export async function POST(req: Request, { params }: Params): Promise<Response> {
  try {
    const { user } = await requireSession(req)
    const { repoId } = await params

    const repo = await prisma.repository.findUnique({ where: { id: repoId } })
    if (!repo) return errorResponse('Repository not found', 404)
    if (repo.userId !== user.id) return errorResponse('Forbidden', 403)

    await prisma.repository.update({ where: { id: repoId }, data: { syncStatus: SyncStatus.SYNCING } })

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const from = (repo.lastSyncedAt ?? ninetyDaysAgo).toISOString().split('T')[0]!
    const to = new Date().toISOString().split('T')[0]!

    const [commits, prs] = await Promise.all([
      fetchCommitsByDateRange(repo.owner, repo.name, repo.defaultBranch, from, to),
      fetchPRsByDateRange(repo.owner, repo.name, from, to),
    ])

    const prMap = new Map(prs.map((p) => [p.date, p]))
    for (const c of commits) {
      const p = prMap.get(c.date) ?? { opened: 0, merged: 0, closed: 0 }
      await prisma.metric.upsert({
        where: { repoId_date: { repoId, date: new Date(c.date) } },
        update: { commits: c.count, additions: c.additions, deletions: c.deletions, prsOpened: p.opened, prsMerged: p.merged, prsClosed: p.closed },
        create: { repoId, date: new Date(c.date), commits: c.count, additions: c.additions, deletions: c.deletions, prsOpened: p.opened, prsMerged: p.merged, prsClosed: p.closed },
      })
    }

    const updated = await prisma.repository.update({
      where: { id: repoId },
      data: { syncStatus: SyncStatus.SUCCESS, lastSyncedAt: new Date() },
      select: { id: true, syncStatus: true, lastSyncedAt: true },
    })

    return Response.json({ repository: updated })
  } catch (err: unknown) {
    await prisma.repository.update({
      where: { id: (await params).repoId },
      data: { syncStatus: SyncStatus.FAILED },
    }).catch(() => {})

    if (err instanceof GitHubRateLimitError) {
      return new Response(JSON.stringify({ error: 'GitHub rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(err.retryAfter) },
      })
    }
    if (err instanceof GitHubUnavailableError) return errorResponse('GitHub is currently unreachable', 502)
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse((err as { message: string }).message, (err as { status: number }).status)
    }
    return errorResponse('Internal server error', 500)
  }
}
