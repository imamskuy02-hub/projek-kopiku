import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_session")?.value;

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, username: payload.username });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ authenticated: false, error: "Internal Server Error" }, { status: 500 });
  }
}
