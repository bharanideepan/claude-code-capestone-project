const COOKIE_NAME = 'devpulse_session'
const MAX_AGE = 60 * 60 * 24 * 30

export function setSessionToken(token: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

export function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match?.[1] ?? null
}

export function clearSessionToken(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}
