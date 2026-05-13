import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

const mockUserFindUnique = vi.fn()
const mockSessionCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    session: { create: mockSessionCreate },
  },
}))

beforeEach(() => vi.clearAllMocks())

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/auth/login', () => {
  it('returns 200 with token on valid credentials', async () => {
    const hash = await bcrypt.hash('password123', 1)
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com', passwordHash: hash })
    mockSessionCreate.mockResolvedValue({
      token: 'abc123',
      expiresAt: new Date(Date.now() + 86400000),
    })

    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'password123' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.token).toBeDefined()
    expect(json.user.email).toBe('alice@example.com')
  })

  it('returns 401 with generic message when email does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(makeRequest({ email: 'nobody@example.com', password: 'password123' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/invalid email or password/i)
  })

  it('returns 401 with generic message when password is wrong', async () => {
    const hash = await bcrypt.hash('correct-password', 1)
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'alice@example.com', passwordHash: hash })

    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'wrong-password' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/invalid email or password/i)
  })

  it('returns 400 when email field is missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(makeRequest({ password: 'password123' }))
    expect(res.status).toBe(400)
  })
})
