const { prisma } = require("./common");
const bcrypt = require("bcrypt");

async function main() {
  await prisma.category.createMany({
    data: [
      { name: "Restaurant" },
      { name: "Book" },
      { name: "Product" },
      { name: "Store" },
    ],
    skipDuplicates: true,
  });

  const adminPassword = await bcrypt.hash("12345", 10);
await prisma.user.upsert({
  where: { email: "iggyjurado45@gmail.com" },
  update: { password: adminPassword },
  create: {
    firstName: "Ignacio",
    lastName: "Jurado",
    email: "iggyjurado45@gmail.com",
    password: adminPassword,
    isAdmin: true,
  },
});

  const userPassword = await bcrypt.hash("user12345", 10);
const regularUser = await prisma.user.upsert({
  where: { email: "johndoe@example.com" },
  update: { password: userPassword },
  create: {
    firstName: "John",
    lastName: "Doe",
    email: "johndoe@example.com",
    password: userPassword,
    isAdmin: false,
  },
});

  const nikeShoes = await prisma.item.upsert({
    where: { name: "Nike Shoes" },
    update: {},
    create: {
      name: "Nike Shoes",
      description: "Great shoes for running.",
      image:
        "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/3b27eb2b-da90-4a12-bb43-a093ca26b4a3/NIKE+FREE+RN+5.0+NEXT+NATURE.png",
      category: { connect: { name: "Product" } },
    },
  });

  const existingReview = await prisma.review.findFirst({
    where: { itemId: nikeShoes.id, userId: regularUser.id },
  });
  if (!existingReview) {
    await prisma.review.create({
      data: {
        rating: 5,
        text: "These shoes are amazing!",
        item: { connect: { id: nikeShoes.id } },
        user: { connect: { id: regularUser.id } },
      },
    });
  }

  await prisma.item.upsert({
    where: { name: "Adidas Sneakers" },
    update: {},
    create: {
      name: "Adidas Sneakers",
      description: "Comfortable sneakers for everyday wear.",
      image:
        "https://bellerose.com/cdn/shop/files/ADI242EG4958M-010_12791089999_8a3c0a4a-699e-42c4-8171-298c34753fef.webp?v=1742003545&width=4000",
      category: { connect: { name: "Product" } },
    },
  });

  await prisma.item.upsert({
    where: { name: "Puma Running Shoes" },
    update: {},
    create: {
      name: "Puma Running Shoes",
      description: "Lightweight and durable shoes.",
      image:
        "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/397894/02/sv01/fnd/PNA/fmt/png/PUMA-Club-5v5-Suede-Men's-Sneakers",
      category: { connect: { name: "Product" } },
    },
  });

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });