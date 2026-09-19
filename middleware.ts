import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAdmin = token?.role === "admin";

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
    destination.pathname = token ? "/" : "/admin/login";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
