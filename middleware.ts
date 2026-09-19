import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const hasAuthenticatedProvider = token?.provider === "google" || token?.provider === "credentials";
  const isAdmin = token?.role === "admin" && hasAuthenticatedProvider;

  if (pathname.startsWith("/api/admin")) {
    if (isAdmin) return NextResponse.next();
    return NextResponse.json(
      { error: token ? "Forbidden" : "Unauthorized" },
      { status: token ? 403 : 401 }
    );
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (isAdmin) return NextResponse.next();

    const destination = request.nextUrl.clone();
    destination.pathname = "/admin/login";
    destination.search = token && !isAdmin ? "?error=admin_required" : "";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
