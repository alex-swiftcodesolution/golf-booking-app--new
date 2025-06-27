import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const tokenExpires = request.cookies.get("tokenExpires")?.value;

  if (!tokenExpires || Date.now() > parseInt(tokenExpires, 10)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("authToken");
    response.cookies.delete("memberId");
    response.cookies.delete("tokenExpires");
    response.cookies.delete("deviceFingerprint");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"], // Expand as needed
};
