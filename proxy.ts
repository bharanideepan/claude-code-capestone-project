import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('devpulse_session')?.value
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/settings')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/login', '/register'],
}
