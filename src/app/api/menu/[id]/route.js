import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// PUT: Update menu item berdasarkan ID (Khusus Admin)
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
    const { name, description, price, categoryId, image, available } = body;

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseInt(price) : undefined,
        categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
        image,
        available: available !== undefined ? available : undefined,
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("PUT Menu Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui menu" }, { status: 500 });
  }
}

// DELETE: Hapus menu item berdasarkan ID (Khusus Admin)
export async function DELETE(request, { params }) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_session")?.value;
    const admin = verifyToken(token);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);

    await prisma.menuItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Menu berhasil dihapus" });
  } catch (error) {
    console.error("DELETE Menu Error:", error);
    return NextResponse.json({ error: "Gagal menghapus menu" }, { status: 500 });
  }
}
