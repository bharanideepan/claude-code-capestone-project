import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { create: mockCreate, findUnique: mockFindUnique },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /api/auth/register', () => {
  it('returns 201 with user object on valid input', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      createdAt: new Date('2026-01-01'),
    })

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'password123' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.user.email).toBe('alice@example.com')
    expect(json.user.id).toBe('user-1')
  })

  it('does not return passwordHash in the response', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: 'should-not-appear',
      createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'password123' }))
    const json = await res.json()

    expect(json.user.passwordHash).toBeUndefined()
  })

  it('returns 400 when email is malformed', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'password123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeDefined()
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'short' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'password123' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already/i)
  })
})
