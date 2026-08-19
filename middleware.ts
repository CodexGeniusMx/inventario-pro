import { NextResponse, type NextRequest } from "next/server"

import { logAuthRedirect } from "@/lib/auth/redirect-log"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/login", "/accept-invite", "/auth/callback"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/api")) {
    return false
  }

  if (isPublicPath(pathname)) {
    return false
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return false
  }

  return true
}

function forwardWithPathname(
  request: NextRequest,
  pathname: string,
  sourceResponse: NextResponse
): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  const nextResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  sourceResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    nextResponse.cookies.set(name, value, options)
  })

  return nextResponse
}

export async function middleware(request: NextRequest) {
  const { response: sessionResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dev") && process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 })
  }

  if (user && pathname === "/login") {
    logAuthRedirect({
      pathname,
      userId: user.id,
      profileFound: true,
      destination: "/dashboard",
      reason: "Authenticated user visiting login page.",
    })
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (!user && isProtectedPath(pathname)) {
    logAuthRedirect({
      pathname,
      userId: null,
      profileFound: false,
      destination: "/login",
      reason: "Unauthenticated request to protected route.",
    })
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(url)
  }

  return forwardWithPathname(request, pathname, sessionResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
