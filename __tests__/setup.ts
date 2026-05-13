import { vi } from 'vitest'

// Mock Next.js server-only internals so route handlers can be imported in tests
vi.mock('server-only', () => ({}))
