type Window = { count: number; resetAt: number }

const store = new Map<string, Window>()

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfter: number }

/**
 * Sliding-window rate limiter backed by an in-process Map.
 * Suitable for single-instance deployments (this project's scope).
 * Replace the store with Redis for multi-instance deployments.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false }
  }

  if (entry.count >= maxRequests) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { limited: false }
}
