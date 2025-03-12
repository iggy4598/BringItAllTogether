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
  await prisma.user.create({
    data: {
      firstName: "Ignacio",
      lastName: "Jurado",
      email: "iggyjurado45@gmail.com",
      password: 12345,
      isAdmin: true,
    },
  });

  const userPassword = await bcrypt.hash("user12345", 10);
  await prisma.user.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@example.com",
      password: userPassword,
      isAdmin: false,
    },
  });

  await prisma.item.create({
    data: {
      name: "Nike Shoes",
      description: "Great shoes for running.",
      image:
        "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/3b27eb2b-da90-4a12-bb43-a093ca26b4a3/NIKE+FREE+RN+5.0+NEXT+NATURE.png",
      category: { connect: { name: "Product" } },
    },
  });

  const item = await prisma.item.findFirst({ where: { name: "Nike Shoes" } });
  const user = await prisma.user.findUnique({
    where: { email: "johndoe@example.com" },
  });
  if (item && user) {
    await prisma.review.create({
      data: {
        rating: 5,
        text: "These shoes are amazing!",
        item: { connect: { id: item.id } },
        user: { connect: { id: user.id } },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
