import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Intercept admin and login pages
  if (path.startsWith("/admin") || path.startsWith("/login")) {
    const hasCookie = request.cookies.has("is_admin_app");
    const hasParam = url.searchParams.get("app") === "true";

    // If neither the cookie nor the URL parameter is present, return 404
    if (!hasCookie && !hasParam) {
      return new NextResponse(null, { status: 404 });
    }

    // If the URL has ?app=true, set the cookie so they stay authenticated as the app
    if (hasParam && !hasCookie) {
      const response = NextResponse.next();
      response.cookies.set("is_admin_app", "true", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
