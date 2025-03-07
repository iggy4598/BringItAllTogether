const { prisma } = require("./common");
const bcrypt = require("bcrypt");

async function main() {
  await prisma.category.CreateMany({
    data: [
      { name: "Restaurant" },
      { name: "Book" },
      { name: "Product" },
      { name: "Store" },
    ],
    skipDuplicates: true,
    //SkipDuplicates tells the program to ignore repeated items ex. [1, 2, 2, 3] will be treated at [1, 2, 3]
  });
}
const adminPassword = await bcrypt.hash("12345", 10);
await prisma.user.create({
  data: {
    firstName: "Ignacio",
    lastName: "Jurado",
    email: "iggyjurado45@gmail.com",
    password: 45982217,
    isAdmin: true,
  },
});

const userPassword = await bcrypt.hash("user12345", 10);
await prisma.user.create({
  data: {
    firstName: "",
    lastName: "",
    email: "",
    password: {},
  },
});

const item = await prisma.item.create({
  data: {
    name: "nike",
    description: "great shoes",
    category: { connect: { name: "Restaurant" } },
  },
});
