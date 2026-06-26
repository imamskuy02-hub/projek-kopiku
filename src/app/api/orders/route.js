import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET: Ambil semua data pesanan (Khusus Admin)
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("admin_session")?.value;
    const admin = verifyToken(token);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET Orders Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pesanan" }, { status: 500 });
  }
}

// POST: Buat pesanan baru
export async function POST(request) {
  try {
    const body = await request.json();
    const { customerName, tableNumber, notes, paymentMethod, totalAmount, items, status } = body;

    if (!customerName || !tableNumber || !paymentMethod || !totalAmount || !items) {
      return NextResponse.json({ error: "Data pesanan tidak lengkap" }, { status: 400 });
    }

    const newOrder = await prisma.order.create({
      data: {
        customerName,
        tableNumber,
        notes,
        paymentMethod,
        totalAmount: parseInt(totalAmount),
        status: status || "PENDING",
        items: typeof items === "string" ? items : JSON.stringify(items),
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("POST Order Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses pesanan baru" }, { status: 500 });
  }
}
