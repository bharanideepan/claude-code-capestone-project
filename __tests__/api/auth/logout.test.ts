import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionFindUnique = vi.fn()
const mockSessionDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    session: { findUnique: mockSessionFindUnique, delete: mockSessionDelete, update: vi.fn() },
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('POST /api/auth/logout', () => {
  it('returns 200 and deletes the session', async () => {
    mockSessionFindUnique.mockResolvedValue({
      id: 'sess-1', userId: 'user-1', token: 'valid-token',
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: 'user-1', email: 'alice@example.com' },
    })
    mockSessionDelete.mockResolvedValue({})

    const { POST } = await import('@/app/api/auth/logout/route')
    const req = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockSessionDelete).toHaveBeenCalledWith({ where: { token: 'valid-token' } })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { POST } = await import('@/app/api/auth/logout/route')
    const req = new Request('http://localhost/api/auth/logout', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token does not exist', async () => {
    mockSessionFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/auth/logout/route')
    const req = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad-token' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
