import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Lindungi route privat. Cek keberadaan cookie sesi (edge-compatible, hanya
 * cek keberadaan - validasi penuh tetap dilakukan server-side di halaman/action).
 */
export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/scenarios/:path*", "/compare"],
};
