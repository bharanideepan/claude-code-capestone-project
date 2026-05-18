import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

export type SessionUser = { id: string; email: string }
export type SessionData = {
  session: { id: string; userId: string; token: string; expiresAt: Date }
  user: SessionUser
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, 12)

export const comparePassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash)

export const generateSessionToken = (): string =>
  randomBytes(32).toString('hex')

export const createSessionExpiry = (): Date => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
}

export const isSessionExpired = (expiresAt: Date): boolean =>
  expiresAt.getTime() < Date.now()

export const requireSession = async (req: Request): Promise<SessionData> => {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) throw new ApiError(401, 'Missing authorization token')

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  })

  if (!session) throw new ApiError(401, 'Invalid session token')
  if (isSessionExpired(session.expiresAt)) throw new ApiError(401, 'Session expired')

  // Sliding expiry: refresh the 30-day window on every authenticated request
  await prisma.session.update({
    where: { token },
    data: { expiresAt: createSessionExpiry() },
  })

  return { session, user: session.user }
}
