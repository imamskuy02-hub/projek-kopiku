import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-Type harus multipart/form-data" }, { status: 400 });
    }

    // Ekstrak boundary
    const match = contentType.match(/boundary=(.+)/);
    if (!match) {
      return NextResponse.json({ error: "Boundary tidak ditemukan" }, { status: 400 });
    }
    const boundary = `--${match[1]}`;

    // Baca raw body sebagai ArrayBuffer lalu konversi ke Buffer
    const rawBody = Buffer.from(await request.arrayBuffer());

    // Cari posisi boundary di dalam buffer
    const parts = [];
    let searchIndex = 0;
    while (true) {
      const index = rawBody.indexOf(boundary, searchIndex);
      if (index === -1) break;
      parts.push(index);
      searchIndex = index + boundary.length;
    }

    if (parts.length < 2) {
      return NextResponse.json({ error: "Format berkas tidak valid" }, { status: 400 });
    }

    let fileBuffer = null;
    let filename = "upload.jpg";
    let fileType = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const start = parts[i] + boundary.length;
      const end = parts[i + 1];
      
      const partBuffer = rawBody.subarray(start, end);
      
      const headerEndIndex = partBuffer.indexOf("\r\n\r\n");
      if (headerEndIndex === -1) continue;
      
      const headersString = partBuffer.subarray(0, headerEndIndex).toString("utf-8");
      
      if (headersString.includes('name="file"')) {
        // Ekstrak nama file asli
        const filenameMatch = headersString.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
        
        // Ekstrak tipe file
        const contentTypeMatch = headersString.match(/Content-Type:\s*([^\r\n]+)/i);
        if (contentTypeMatch) {
          fileType = contentTypeMatch[1];
        }

        // Ambil data file (setelah \r\n\r\n)
        let dataBuffer = partBuffer.subarray(headerEndIndex + 4);
        
        // Buang delimiter \r\n di akhir data sebelum boundary berikutnya
        if (dataBuffer.length >= 2 && dataBuffer[dataBuffer.length - 2] === 13 && dataBuffer[dataBuffer.length - 1] === 10) {
          dataBuffer = dataBuffer.subarray(0, dataBuffer.length - 2);
        } else if (dataBuffer.length >= 1 && dataBuffer[dataBuffer.length - 1] === 10) {
          dataBuffer = dataBuffer.subarray(0, dataBuffer.length - 1);
        }
        
        fileBuffer = dataBuffer;
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang ditemukan dalam form" }, { status: 400 });
    }

    // Validasi tipe berkas harus gambar
    if (fileType && !fileType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    // Pastikan direktori public/uploads ada
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Generate nama file unik
    const ext = path.extname(filename) || ".jpg";
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Simpan file ke disk
    await writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Gagal mengunggah berkas: " + error.message }, { status: 500 });
  }
}
