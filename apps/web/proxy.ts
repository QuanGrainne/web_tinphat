import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN_PAGES = new Set(["/admin/login", "/admin/forgot-password", "/admin/reset-password"]);

/** Admin pages need the session cookie; the API still checks every call (this only avoids rendering the shell logged out). */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // pages for signing in and for a forgotten password are open without a session
  if (PUBLIC_ADMIN_PAGES.has(pathname)) return NextResponse.next();
  if (!request.cookies.has("DNA_SESSION")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
