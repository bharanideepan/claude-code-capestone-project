import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests written BEFORE implementation (TDD)
// Run: pnpm test __tests__/lib/auth.test.ts

describe('hashPassword', () => {
  it('returns a string different from the input', async () => {
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(typeof hash).toBe('string')
  })

  it('produces a bcrypt hash starting with $2', async () => {
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword('secret123')
    expect(hash.startsWith('$2')).toBe(true)
  })
})

describe('comparePassword', () => {
  it('returns true when password matches the hash', async () => {
    const { hashPassword, comparePassword } = await import('@/lib/auth')
    const hash = await hashPassword('correct-horse')
    expect(await comparePassword('correct-horse', hash)).toBe(true)
  })

  it('returns false when password does not match', async () => {
    const { hashPassword, comparePassword } = await import('@/lib/auth')
    const hash = await hashPassword('correct-horse')
    expect(await comparePassword('wrong-password', hash)).toBe(false)
  })
})

describe('generateSessionToken', () => {
  it('returns a hex string of at least 64 characters', async () => {
    const { generateSessionToken } = await import('@/lib/auth')
    const token = generateSessionToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThanOrEqual(64)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
  })

  it('produces unique tokens on successive calls', async () => {
    const { generateSessionToken } = await import('@/lib/auth')
    const tokens = new Set(Array.from({ length: 10 }, () => generateSessionToken()))
    expect(tokens.size).toBe(10)
  })
})

describe('createSessionExpiry', () => {
  it('returns a date 30 days in the future by default', async () => {
    const { createSessionExpiry } = await import('@/lib/auth')
    const before = Date.now()
    const expiry = createSessionExpiry()
    const after = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + thirtyDays - 1000)
    expect(expiry.getTime()).toBeLessThanOrEqual(after + thirtyDays + 1000)
  })
})

describe('isSessionExpired', () => {
  it('returns true when expiresAt is in the past', async () => {
    const { isSessionExpired } = await import('@/lib/auth')
    const past = new Date(Date.now() - 1000)
    expect(isSessionExpired(past)).toBe(true)
  })

  it('returns false when expiresAt is in the future', async () => {
    const { isSessionExpired } = await import('@/lib/auth')
    const future = new Date(Date.now() + 60_000)
    expect(isSessionExpired(future)).toBe(false)
  })
})

describe('requireSession', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws 401 when Authorization header is missing', async () => {
    vi.doMock('@/lib/db', () => ({
      prisma: { session: { findUnique: vi.fn().mockResolvedValue(null) } },
    }))
    const { requireSession } = await import('@/lib/auth')
    const req = new Request('http://localhost/api/test')
    await expect(requireSession(req)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when token is not found in database', async () => {
    vi.doMock('@/lib/db', () => ({
      prisma: { session: { findUnique: vi.fn().mockResolvedValue(null) } },
    }))
    const { requireSession } = await import('@/lib/auth')
    const req = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer nonexistent-token' },
    })
    await expect(requireSession(req)).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when session is expired', async () => {
    vi.doMock('@/lib/db', () => ({
      prisma: {
        session: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-1',
            userId: 'user-1',
            token: 'expired-token',
            expiresAt: new Date(Date.now() - 1000),
            user: { id: 'user-1', email: 'test@example.com' },
          }),
        },
      },
    }))
    const { requireSession } = await import('@/lib/auth')
    const req = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer expired-token' },
    })
    await expect(requireSession(req)).rejects.toMatchObject({ status: 401 })
  })

  it('returns session and user when token is valid', async () => {
    const futureDate = new Date(Date.now() + 60_000)
    vi.doMock('@/lib/db', () => ({
      prisma: {
        session: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-1',
            userId: 'user-1',
            token: 'valid-token',
            expiresAt: futureDate,
            user: { id: 'user-1', email: 'test@example.com' },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    }))
    const { requireSession } = await import('@/lib/auth')
    const req = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const result = await requireSession(req)
    expect(result.session.token).toBe('valid-token')
    expect(result.user.email).toBe('test@example.com')
  })

  it('refreshes session expiry on each valid request (sliding expiry)', async () => {
    const soonExpiring = new Date(Date.now() + 60_000)
    const mockUpdate = vi.fn().mockResolvedValue({})
    vi.doMock('@/lib/db', () => ({
      prisma: {
        session: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sess-1',
            userId: 'user-1',
            token: 'valid-token',
            expiresAt: soonExpiring,
            user: { id: 'user-1', email: 'test@example.com' },
          }),
          update: mockUpdate,
        },
      },
    }))
    const { requireSession } = await import('@/lib/auth')
    const req = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    await requireSession(req)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'valid-token' },
        data: expect.objectContaining({ expiresAt: expect.any(Date) }),
      }),
    )
  })
})
