import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { dashboardQuerySchema, errorResponse } from '@/types/index'

export async function GET(req: Request): Promise<Response> {
  try {
    const { user } = await requireSession(req)

    const url = new URL(req.url)
    const parsed = dashboardQuerySchema.safeParse({
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    })
    if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid query', 400)

    const { from, to } = parsed.data

    const repos = await prisma.repository.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true },
    })
    const repoIds = repos.map((r) => r.id)

    const metrics = await prisma.metric.findMany({
      where: { repoId: { in: repoIds }, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { date: 'asc' },
    })

    const totals = metrics.reduce(
      (acc, m) => ({
        commits: acc.commits + m.commits,
        prsOpened: acc.prsOpened + m.prsOpened,
        prsMerged: acc.prsMerged + m.prsMerged,
        contributors: acc.contributors + m.contributors,
        additions: acc.additions + m.additions,
        deletions: acc.deletions + m.deletions,
      }),
      { commits: 0, prsOpened: 0, prsMerged: 0, contributors: 0, additions: 0, deletions: 0 },
    )

    const byRepoMap = new Map<string, { commits: number; prsMerged: number }>()
    for (const m of metrics) {
      const cur = byRepoMap.get(m.repoId) ?? { commits: 0, prsMerged: 0 }
      byRepoMap.set(m.repoId, { commits: cur.commits + m.commits, prsMerged: cur.prsMerged + m.prsMerged })
    }

    const byRepo = repos.map((r) => ({
      repoId: r.id,
      fullName: r.fullName,
      ...(byRepoMap.get(r.id) ?? { commits: 0, prsMerged: 0 }),
    }))

    const dailyCommits = metrics.reduce(
      (acc, m) => {
        const dateStr = m.date.toISOString().split('T')[0]!
        acc[dateStr] = (acc[dateStr] ?? 0) + m.commits
        return acc
      },
      {} as Record<string, number>,
    )

    const topContributorDays = Object.entries(dailyCommits)
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10)

    return Response.json({ from, to, totals, byRepo, topContributorDays })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse((err as { message: string }).message, (err as { status: number }).status)
    }
    return errorResponse('Internal server error', 500)
  }
}
