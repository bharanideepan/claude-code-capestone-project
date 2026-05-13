import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerSchema, errorResponse } from '@/types/index'

export async function POST(req: Request): Promise<Response> {
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
