import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const secret = process.env.NEXTAUTH_SECRET

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Get JWT token (works with next-auth JWT strategy)
  const token = await getToken({ req, secret })

  const isLoggedIn = !!token
  const role = token?.role as string | undefined

  // ── Public routes (no auth required) ──────────────────────────────────
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    // Redirect logged-in users away from login page
    if (isLoggedIn && pathname === '/login') {
      const dest = role === 'admin' ? '/admin/dashboard' : '/staff/dashboard'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Authentication check ───────────────────────────────────────────────
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Admin-only routes ──────────────────────────────────────────────────
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/reports') ||
    pathname.startsWith('/api/config')
  ) {
    if (role !== 'admin') {
      // Staff trying to access admin — redirect to their dashboard
      return NextResponse.redirect(new URL('/staff/dashboard', req.url))
    }
  }

  // ── Staff + Admin routes (authenticated) ──────────────────────────────
  if (pathname.startsWith('/staff') || pathname.startsWith('/api/claims')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // ── Root redirect ──────────────────────────────────────────────────────
  if (pathname === '/') {
    const dest = role === 'admin' ? '/admin/dashboard' : '/staff/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
