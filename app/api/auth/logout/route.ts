import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { errorResponse } from '@/types/index'

export async function POST(req: Request): Promise<Response> {
  try {
    const { session } = await requireSession(req)
    await prisma.session.delete({ where: { token: session.token } })
    return Response.json({ success: true })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse((err as { message: string }).message, (err as { status: number }).status)
    }
    return errorResponse('Internal server error', 500)
  }
}
