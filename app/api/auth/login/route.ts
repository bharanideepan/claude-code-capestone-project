import { prisma } from '@/lib/db'
import { comparePassword, generateSessionToken, createSessionExpiry } from '@/lib/auth'
import { loginSchema, errorResponse } from '@/types/index'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid input', 400)
  }

  const { email, password } = parsed.data
  const INVALID = 'Invalid email or password'

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return errorResponse(INVALID, 401)

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) return errorResponse(INVALID, 401)

  const token = generateSessionToken()
  const expiresAt = createSessionExpiry()

  const session = await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
    select: { token: true, expiresAt: true },
  })

  return Response.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: user.id, email: user.email },
  })
}
