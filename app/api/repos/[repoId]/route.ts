import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { errorResponse } from '@/types/index'

type Params = { params: Promise<{ repoId: string }> }

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  try {
    const { user } = await requireSession(req)
    const { repoId } = await params

    const repo = await prisma.repository.findUnique({ where: { id: repoId } })
    if (!repo) return errorResponse('Repository not found', 404)
    if (repo.userId !== user.id) return errorResponse('Forbidden', 403)

    await prisma.repository.delete({ where: { id: repoId } })
    return Response.json({ success: true })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse(String((err as Record<string, unknown>).message), Number((err as Record<string, unknown>).status))
    }
    return errorResponse('Internal server error', 500)
  }
}
