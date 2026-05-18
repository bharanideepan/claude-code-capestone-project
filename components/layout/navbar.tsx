'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSessionToken, clearSessionToken } from '@/lib/session-cookie'

type NavbarProps = {
  userEmail: string
}

export function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter()

  async function handleLogout() {
    const token = getSessionToken()
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    clearSessionToken()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <span className="text-lg font-semibold text-slate-900">DevPulse</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </header>
  )
}
