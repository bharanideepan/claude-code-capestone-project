import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isSessionExpired } from '@/lib/auth'

export type ServerSessionUser = { id: string; email: string }

export async function getServerSession(): Promise<{ userId: string; email: string; token: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('devpulse_session')?.value
  if (!token) redirect('/login')

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  })

  if (!session || isSessionExpired(session.expiresAt)) redirect('/login')

  return { userId: session.user.id, email: session.user.email, token }
}
