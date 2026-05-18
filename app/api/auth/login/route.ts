import { prisma } from '@/lib/db'
import { comparePassword, generateSessionToken, createSessionExpiry } from '@/lib/auth'
import { loginSchema, errorResponse } from '@/types/index'
import { checkRateLimit } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP
const LOGIN_MAX = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`login:${ip}`, LOGIN_MAX, LOGIN_WINDOW_MS)
  if (rl.limited) {
    return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) },
    })
  }

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
