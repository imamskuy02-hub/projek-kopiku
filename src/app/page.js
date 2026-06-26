import prisma from "@/lib/db";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Ambil semua kategori beserta item menu di dalamnya
  const categories = await prisma.category.findMany({
    include: {
      menuItems: {
        orderBy: {
          name: 'asc'
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  // Gabungkan semua menu untuk mempermudah pencarian lintas kategori
  const allMenuItems = categories.flatMap(cat => 
    cat.menuItems.map(item => ({
      ...item,
      categoryName: cat.name,
      categorySlug: cat.slug
    }))
  );

  return (
    <MenuClient 
      initialCategories={categories} 
      initialMenuItems={allMenuItems} 
    />
  );
}
