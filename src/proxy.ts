import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends a visitor with no session cookie at all straight to sign-in from the
 * account and admin areas. Their layouts are still the real check (a cookie
 * can be expired or forged); this only stops a signed-out request from
 * rendering the page anyway: Next renders a page alongside its layout, so a
 * signed-out /admin hit used to run every dashboard query before the
 * layout's redirect, and held the request open while they ran. The targets
 * match the layouts' own redirects.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("authjs.session-token") || name.startsWith("__Secure-authjs.session-token"));
  if (hasSessionCookie) return NextResponse.next();
  const area = request.nextUrl.pathname.startsWith("/admin") ? "/admin" : "/account";
  return NextResponse.redirect(new URL(`/sign-in?returnTo=${area}`, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*"],
};
