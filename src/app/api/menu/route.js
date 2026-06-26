import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET: Ambil semua menu item
export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true
      },
      orderBy: {
        id: "desc"
      }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET Menu Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data menu" }, { status: 500 });
  }
}

// POST: Buat menu item baru (Khusus Admin)
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_session")?.value;
    const admin = verifyToken(token);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, categoryId, image, available } = body;

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: "Nama, Harga, dan Kategori wajib diisi" }, { status: 400 });
    }

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseInt(price),
        categoryId: parseInt(categoryId),
        image: image || '/images/espresso.jpg', // Default placeholder
        available: available !== undefined ? available : true,
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("POST Menu Error:", error);
    return NextResponse.json({ error: "Gagal membuat menu baru" }, { status: 500 });
  }
}
