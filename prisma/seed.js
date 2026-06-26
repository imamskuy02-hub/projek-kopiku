const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.admin.deleteMany();

  // Create Admin
  const admin = await prisma.admin.create({
    data: {
      username: 'admin',
      password: hashPassword('admin123'),
    },
  });
  console.log('Created Admin user: admin / admin123');

  // Create Categories
  const espressoCat = await prisma.category.create({
    data: { name: 'Espresso Base', slug: 'espresso-base' },
  });

  const milkCat = await prisma.category.create({
    data: { name: 'Milk Base', slug: 'milk-base' },
  });

  const nonCoffeeCat = await prisma.category.create({
    data: { name: 'Non-Coffee', slug: 'non-coffee' },
  });

  const pastryCat = await prisma.category.create({
    data: { name: 'Pastry', slug: 'pastry' },
  });

  console.log('Created categories.');

  // Create Menu Items
  const items = [
    {
      name: 'Espresso',
      description: 'Single shot espresso murni menggunakan biji kopi arabika pilihan dengan aroma yang kuat dan crema tebal.',
      price: 18000,
      image: '/images/espresso.jpg',
      categoryId: espressoCat.id,
    },
    {
      name: 'Americano',
      description: 'Double shot espresso yang diencerkan dengan air panas, menyajikan rasa kopi yang bersih, kuat, dan menyegarkan.',
      price: 22000,
      image: '/images/americano.jpg',
      categoryId: espressoCat.id,
    },
    {
      name: 'Café Latte',
      description: 'Espresso kaya rasa yang dipadukan dengan steamed milk lembut dan lapisan foam tipis di atasnya.',
      price: 28000,
      image: '/images/latte.jpg',
      categoryId: milkCat.id,
    },
    {
      name: 'Cappuccino',
      description: 'Minuman kopi klasik dengan perbandingan seimbang antara espresso, steamed milk, dan milk foam tebal.',
      price: 28000,
      image: '/images/cappuccino.jpg',
      categoryId: milkCat.id,
    },
    {
      name: 'Caramel Macchiato',
      description: 'Perpaduan espresso, sirup vanilla premium, susu segar, dan siraman saus karamel manis di atasnya.',
      price: 32000,
      image: '/images/caramel-macchiato.jpg',
      categoryId: milkCat.id,
    },
    {
      name: 'Matcha Latte',
      description: 'Bubuk matcha Jepang berkualitas tinggi yang diseduh dan diaduk dengan susu segar hangat.',
      price: 30000,
      image: '/images/matcha-latte.jpg',
      categoryId: nonCoffeeCat.id,
    },
    {
      name: 'Signature Chocolate',
      description: 'Cokelat hitam premium pekat yang dipadukan secara sempurna dengan susu segar yang creamy.',
      price: 30000,
      image: '/images/chocolate.jpg',
      categoryId: nonCoffeeCat.id,
    },
    {
      name: 'Butter Croissant',
      description: 'Croissant panggang klasik Perancis yang renyah di luar, lembut di dalam, dan sangat terasa menteganya.',
      price: 20000,
      image: '/images/croissant.jpg',
      categoryId: pastryCat.id,
    },
    {
      name: 'Chocolate Fudge Cake',
      description: 'Satu potong kue cokelat lembut berlapis fudge cokelat pekat yang manis dan memanjakan lidah.',
      price: 25000,
      image: '/images/fudge-cake.jpg',
      categoryId: pastryCat.id,
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
