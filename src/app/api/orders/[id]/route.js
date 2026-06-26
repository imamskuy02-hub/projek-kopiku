import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// PUT: Update status pesanan berdasarkan ID (Khusus Admin)
export async function PUT(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_session")?.value;
    const admin = verifyToken(token);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("PUT Order Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status pesanan" }, { status: 500 });
  }
}
