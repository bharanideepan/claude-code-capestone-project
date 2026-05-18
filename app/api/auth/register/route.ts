import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerSchema, errorResponse } from '@/types/index'
import { checkRateLimit } from '@/lib/rate-limit'

// 5 registrations per hour per IP to prevent account farming
const REGISTER_MAX = 5
const REGISTER_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`register:${ip}`, REGISTER_MAX, REGISTER_WINDOW_MS)
  if (rl.limited) {
    return new Response(JSON.stringify({ error: 'Too many registration attempts. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) },
    })
  }

  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid input', 400)
  }

  const { email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return errorResponse('An account with this email already exists', 409)

  const passwordHash = await hashPassword(password)
  const created = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  })

  return Response.json({ user: { id: created.id, email: created.email, createdAt: created.createdAt } }, { status: 201 })
}
