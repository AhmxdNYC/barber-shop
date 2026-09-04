import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

/**
 * Keeps unauthenticated requests out of the dashboard.
 *
 * This is the first line only — every dashboard page calls requireBarber()
 * as well, because middleware is a matcher away from being accidentally
 * disabled and the pages read private client data.
 */
export async function middleware(request: NextRequest) {
  const session = await readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session) {
    const url = new URL("/login", request.url);
    // Send them back where they were headed once they are in.
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
