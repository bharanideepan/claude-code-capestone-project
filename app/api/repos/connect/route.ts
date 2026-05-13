import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { connectRepoSchema, errorResponse } from '@/types/index'
import { getRepoInfo, GitHubRepoNotFoundError, GitHubUnavailableError } from '@/lib/github'
import { SyncStatus } from '@prisma/client'

export async function POST(req: Request): Promise<Response> {
  try {
    const { user } = await requireSession(req)

    const body = await req.json().catch(() => null)
    const parsed = connectRepoSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid input', 400)
    }

    const { owner, name } = parsed.data

    const existing = await prisma.repository.findUnique({ where: { owner_name: { owner, name } } })
    if (existing) return errorResponse('Repository is already connected', 409)

    const info = await getRepoInfo(owner, name)

    const repository = await prisma.repository.create({
      data: {
        githubId: info.githubId,
        owner: info.owner,
        name: info.name,
        fullName: info.fullName,
        description: info.description,
        isPrivate: info.isPrivate,
        defaultBranch: info.defaultBranch,
        userId: user.id,
        syncStatus: SyncStatus.PENDING,
      },
      select: { id: true, fullName: true, syncStatus: true },
    })

    return Response.json({ repository }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof GitHubRepoNotFoundError) return errorResponse('Repository not found on GitHub', 404)
    if (err instanceof GitHubUnavailableError) return errorResponse('GitHub is currently unreachable', 502)
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse((err as { message: string }).message, (err as { status: number }).status)
    }
    return errorResponse('Internal server error', 500)
  }
}
