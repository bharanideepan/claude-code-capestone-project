import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { errorResponse } from '@/types/index'

export async function GET(req: Request): Promise<Response> {
  try {
    const { user } = await requireSession(req)
    const repositories = await prisma.repository.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ repositories })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse((err as { message: string }).message, (err as { status: number }).status)
    }
    return errorResponse('Internal server error', 500)
  }
}
