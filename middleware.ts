import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Auth pages - redirect to dashboard if logged in
  if (
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register")
  ) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return res;
  }

  // Protected routes - redirect to login if not authenticated
  if (
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/clients") ||
    req.nextUrl.pathname.startsWith("/tickets") ||
    req.nextUrl.pathname.startsWith("/reports")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/tickets/:path*",
    "/reports/:path*",
    "/login",
    "/register",
  ],
};
