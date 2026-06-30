import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    // Login sukses
    const token = signToken({ id: admin.id, username: admin.username });
    const response = NextResponse.json({ success: true, username: admin.username });
    
    // Set secure HTTP-only cookie
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat login" }, { status: 500 });
  }
}
