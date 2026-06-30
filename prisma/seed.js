const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.admin.deleteMany();

  // Create Admin
  // ⚠️ PENTING: Ganti password di bawah setelah pertama kali deploy!
  // Jalankan ulang `npm run db:seed` setelah mengubah password.
  const adminPassword = 'admin123';
  const admin = await prisma.admin.create({
    data: {
      username: 'admin',
      password: await hashPassword(adminPassword),
    },
  });
  console.log(`Created Admin user: admin / ${adminPassword} (SEGERA GANTI SETELAH DEPLOY!)`);

  // Create Categories
  const makananUtamaCat = await prisma.category.create({
    data: { name: 'Makanan Utama', slug: 'makanan-utama' },
  });

  const sayuranLaukCat = await prisma.category.create({
    data: { name: 'Sayuran & Lauk', slug: 'sayuran-lauk' },
  });

  const minumanCat = await prisma.category.create({
    data: { name: 'Minuman', slug: 'minuman' },
  });

  const camilanCat = await prisma.category.create({
    data: { name: 'Camilan', slug: 'camilan' },
  });

  console.log('Created categories.');

  // Create Menu Items
  const items = [
    {
      name: 'Nasi Goreng Spesial',
      description: 'Nasi goreng dengan bumbu rempah rahasia, disajikan dengan suwiran ayam, bakso, dan taburan bawang goreng.',
      price: 25000,
      image: '/images/nasi_goreng.png',
      categoryId: makananUtamaCat.id,
    },
    {
      name: 'Ayam Bakar Taliwang',
      description: 'Ayam bakar khas Lombok dengan bumbu pedas manis meresap, disajikan dengan sambal terasi.',
      price: 35000,
      image: '/images/ayam_bakar.png',
      categoryId: makananUtamaCat.id,
    },
    {
      name: 'Sate Ayam Madura',
      description: '10 tusuk sate ayam empuk dengan baluran bumbu kacang kental dan kecap manis.',
      price: 30000,
      image: '/images/sate_ayam.png',
      categoryId: makananUtamaCat.id,
    },
    {
      name: 'Tumis Kangkung Terasi',
      description: 'Kangkung segar ditumis dengan bumbu terasi pilihan dan irisan cabai merah.',
      price: 15000,
      image: '/images/tumis_kangkung.png',
      categoryId: sayuranLaukCat.id,
    },
    {
      name: 'Tahu Tempe Penyet',
      description: 'Tahu dan tempe goreng renyah disajikan dengan sambal bawang pedas nendang.',
      price: 12000,
      image: '/images/tahu_tempe.png',
      categoryId: sayuranLaukCat.id,
    },
    {
      name: 'Es Teh Manis',
      description: 'Teh melati seduh asli dengan gula batu murni.',
      price: 5000,
      image: '/images/es_teh.png',
      categoryId: minumanCat.id,
    },
    {
      name: 'Es Jeruk Peras',
      description: 'Perasan jeruk asli yang menyegarkan dahaga.',
      price: 10000,
      image: '/images/es_jeruk.png',
      categoryId: minumanCat.id,
    },
    {
      name: 'Jus Alpukat',
      description: 'Jus alpukat mentega segar dengan siraman kental manis cokelat.',
      price: 15000,
      image: '/images/jus_alpukat.png',
      categoryId: minumanCat.id,
    },
    {
      name: 'Mendoan Panas',
      description: 'Tempe mendoan digoreng setengah matang dengan adonan tepung berbumbu, disajikan dengan sambal kecap.',
      price: 10000,
      image: '/images/mendoan.png',
      categoryId: camilanCat.id,
    },
    {
      name: 'Pisang Goreng Keju',
      description: 'Pisang tanduk goreng renyah dengan taburan keju parut melimpah dan susu kental manis.',
      price: 12000,
      image: '/images/pisang_goreng.png',
      categoryId: camilanCat.id,
    },
  ];

  for (const item of items) {
    await prisma.menuItem.create({ data: item });
  }

  console.log(`Successfully seeded ${items.length} menu items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
