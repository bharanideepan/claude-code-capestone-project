import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mockSessionFindUnique, update: vi.fn() },
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('GET /api/auth/session', () => {
  it('returns 200 with user data for a valid session', async () => {
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess-1', userId: 'user-1', token: 'valid-token',
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: 'user-1', email: 'alice@example.com' },
    })

    const { GET } = await import('@/app/api/auth/session/route')
    const req = new Request('http://localhost/api/auth/session', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.user.email).toBe('alice@example.com')
    expect(json.session.expiresAt).toBeDefined()
  })

  it('returns 401 when session token is missing', async () => {
    const { GET } = await import('@/app/api/auth/session/route')
    const req = new Request('http://localhost/api/auth/session')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when session token is expired', async () => {
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess-1', userId: 'user-1', token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'user-1', email: 'alice@example.com' },
    })

    const { GET } = await import('@/app/api/auth/session/route')
    const req = new Request('http://localhost/api/auth/session', {
      headers: { Authorization: 'Bearer expired-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
