import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { metricsQuerySchema, errorResponse } from '@/types/index'

type Params = { params: Promise<{ repoId: string }> }

export async function GET(req: Request, { params }: Params): Promise<Response> {
  try {
    const { user } = await requireSession(req)
    const { repoId } = await params

    const repo = await prisma.repository.findUnique({ where: { id: repoId } })
    if (!repo) return errorResponse('Repository not found', 404)
    if (repo.userId !== user.id) return errorResponse('Forbidden', 403)

    const url = new URL(req.url)
    const parsed = metricsQuerySchema.safeParse({
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
      granularity: url.searchParams.get('granularity') ?? 'day',
    })
    if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid query', 400)

    const { from, to, granularity } = parsed.data

    if (new Date(from) > new Date(to)) return errorResponse('from must be before to', 400)
    const diffDays = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 365) return errorResponse('Date range cannot exceed 365 days', 400)

    const metrics = await prisma.metric.findMany({
      where: { repoId, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { date: 'asc' },
    })

    const data = metrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      commits: m.commits,
      prsOpened: m.prsOpened,
      prsMerged: m.prsMerged,
      prsClosed: m.prsClosed,
      contributors: m.contributors,
      additions: m.additions,
      deletions: m.deletions,
    }))

    return Response.json({ repoId, from, to, granularity, data })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse(String((err as Record<string, unknown>).message), Number((err as Record<string, unknown>).status))
    }
    return errorResponse('Internal server error', 500)
  }
}
