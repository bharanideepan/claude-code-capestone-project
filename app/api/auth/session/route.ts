import { requireSession } from '@/lib/auth'
import { errorResponse } from '@/types/index'

export async function GET(req: Request): Promise<Response> {
  try {
    const { user, session } = await requireSession(req)
    return Response.json({ user, session: { expiresAt: session.expiresAt } })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return errorResponse(String((err as Record<string, unknown>).message), Number((err as Record<string, unknown>).status))
    }
    return errorResponse('Internal server error', 500)
  }
}
