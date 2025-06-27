// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const tokenExpires = request.cookies.get("tokenExpires")?.value;

  if (tokenExpires && Date.now() > parseInt(tokenExpires, 10)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("authToken", "", { maxAge: 0 });
    response.cookies.set("memberId", "", { maxAge: 0 });
    response.cookies.set("tokenExpires", "", { maxAge: 0 });
    response.cookies.set("deviceFingerprint", "", { maxAge: 0 });
    response.cookies.set("sessionExpired", "true", { maxAge: 60, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"], // Protect specific routes
};
