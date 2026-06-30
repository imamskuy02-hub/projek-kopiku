import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Intercept admin and login pages
  if (path.startsWith("/admin") || path.startsWith("/login")) {
    const hasCookie = request.cookies.has("is_admin_app");
    const hasParam = url.searchParams.get("app") === "true";
    const userAgent = request.headers.get("user-agent") || "";
    const isAppUA = userAgent.includes("KopikuAdminApp") || userAgent.includes("RestoRasaAdminApp");

    // If neither the cookie, URL parameter, nor custom app User-Agent is present, return 404
    if (!hasCookie && !hasParam && !isAppUA) {
      return new NextResponse(null, { status: 404 });
    }

    // If the URL has ?app=true or the request is from the custom APK, set the cookie so they stay authenticated
    if ((hasParam || isAppUA) && !hasCookie) {
      const response = NextResponse.next();
      response.cookies.set("is_admin_app", "true", {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
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
