# Walkthrough: Hosting Kopiku dengan Metode Hybrid (Vercel + cPanel MySQL)

Pekerjaan persiapan hosting telah selesai. Karena cPanel Anda tidak mendukung Node.js secara bawaan, kita menggunakan solusi **Hybrid** yang sangat populer:
1. **Frontend & API Next.js** dideploy ke **Vercel** (platform gratis, sangat cepat, dan mendukung Next.js secara optimal).
2. **Database** disimpan di **MySQL cPanel** Anda (data aman dan tetap berada di hosting Anda).

Berikut adalah panduan langkah demi langkah untuk menayangkan aplikasi secara publik:

---

## Langkah 1: Setup Database MySQL di cPanel
1. Masuk ke cPanel Anda, cari dan pilih menu **MySQL® Database Wizard**.
2. Masukkan nama database baru (misal: `kopiku`), lalu klik **Next Step**.
3. Buat user database baru (misal: `kopiku_user`), buat password yang kuat, lalu klik **Create User**.
4. Centang **ALL PRIVILEGES** agar user dapat mengakses database, lalu klik **Next Step** / **Make Changes**.
5. Catat data berikut untuk digunakan nanti:
   * **Database Name:** `namausercpanel_kopiku`
   * **Database User:** `namausercpanel_kopiku_user`
   * **Database Password:** `password_yang_anda_buat`

---

## Langkah 2: Aktifkan "Remote MySQL" di cPanel
Agar Vercel dan komputer lokal Anda dapat terhubung ke database MySQL cPanel, Anda perlu mengizinkan koneksi remote:
1. Di halaman utama cPanel, cari dan buka menu **Remote MySQL** (biasanya di kategori *Databases*).
2. Di bagian **Add Access Host**, masukkan tanda persen (`%`) di kolom **Host**.
   * *Catatan: Tanda `%` berarti mengizinkan koneksi dari IP mana pun. Ini diperlukan karena Vercel menggunakan IP dinamis.*
3. Klik **Add Host**.

---

## Langkah 3: Jalankan Migrasi Database dari Komputer Lokal Anda
Karena database cPanel sekarang sudah bisa diakses secara remote, kita bisa membuat tabel-tabel dan mengisi data menu awal langsung dari VS Code di komputer Anda:
1. Dapatkan **IP Server Hosting** Anda (bisa dilihat di sidebar kanan halaman utama cPanel pada bagian *Shared IP Address* atau dengan melakukan ping ke domain Anda).
2. Buka file [.env](file:///d:/Projek/.env) di proyek lokal Anda, lalu ubah variabel `DATABASE_URL` agar mengarah ke database MySQL cPanel Anda:
   ```env
   DATABASE_URL="mysql://namausercpanel_kopiku_user:password_yang_anda_buat@IP_SERVER_HOSTING:3306/namausercpanel_kopiku"
   ```
   *(Ganti dengan informasi database dari Langkah 1 & IP Server Hosting Anda).*
3. Buka terminal di VS Code Anda, lalu jalankan perintah berikut untuk membuat tabel database di cPanel:
   ```bash
   npx prisma db push
   ```
4. Jalankan perintah berikut untuk mengisi data menu awal (seeding) ke database cPanel:
   ```bash
   npx prisma db seed
   ```
5. *Selesai! Sekarang database cPanel Anda telah terisi dengan data menu Kopi dan akun admin.*

---

## Langkah 4: Deploy Aplikasi Next.js ke Vercel (Gratis)
Anda memiliki 2 cara mudah untuk mendeploy aplikasi ke Vercel:

### Opsi A: Menggunakan GitHub (Sangat Direkomendasikan)
1. Unggah kode proyek Anda ke repositori baru di GitHub (buat private atau public).
2. Masuk ke **[Vercel](https://vercel.com/)** menggunakan akun GitHub Anda.
3. Klik **Add New** -> **Project**, lalu impor repositori GitHub proyek Kopiku Anda.
4. Di bagian **Environment Variables**, tambahkan variabel baru:
   * **Key:** `DATABASE_URL`
   * **Value:** Isi dengan string koneksi yang sama dengan isi berkas `.env` Langkah 3 (misal: `mysql://namausercpanel_kopiku_user:password@IP_SERVER_HOSTING:3306/namausercpanel_kopiku`).
5. Klik **Deploy**. Tunggu sekitar 1-2 menit hingga proses selesai. Vercel akan memberikan domain publik gratis (contoh: `kopiku-app.vercel.app`) untuk diakses.

### Opsi B: Menggunakan Vercel CLI (Tanpa GitHub)
Jika Anda tidak ingin mengunggah ke GitHub, Anda bisa mendeploy langsung dari terminal komputer Anda:
1. Buka terminal VS Code, instal Vercel CLI secara global:
   ```bash
   npm install -g vercel
   ```
2. Jalankan perintah login:
   ```bash
   vercel login
   ```
3. Mulai proses deploy dengan mengetik:
   ```bash
   vercel
   ```
   *Ikuti instruksi di terminal (tekan Enter untuk pilihan default). saat ditanya "Link to existing project?", ketik `N` (No).*
4. Setelah setup awal selesai, masuk ke dashboard Vercel Anda di browser, buka project baru tersebut, masuk ke **Settings** -> **Environment Variables**, tambahkan `DATABASE_URL` (seperti pada Opsi A langkah 4).
5. Kembali ke terminal dan jalankan deploy production:
   ```bash
   vercel --prod
   ```

---

## Verifikasi Akhir
Setelah proses deploy di Vercel selesai:
1. Buka URL web yang diberikan oleh Vercel.
2. Pastikan halaman beranda memuat data menu kopi dari database cPanel Anda.
3. Coba lakukan transaksi pemesanan kopi untuk memastikan data pesanan masuk ke database.
4. Coba masuk ke dashboard admin melalui `/login` dengan akun default (`admin` / `admin123`) untuk memverifikasi fungsionalitas panel kontrol.
