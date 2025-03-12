const { prisma } = require("./common");

const createNewUser = async (firstName, lastName, email, password) => {
  return await prisma.user.create({
    data: { firstName, lastName, email, password },
  });
};

const getUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

const getUserById = async (id) => {
  return await prisma.user.findUnique({ where: { id: Number(id) } });
};

const getAllUsers = async () => {
  return await prisma.user.findMany();
};

const updateUser = async (id, firstName, lastName, email, password) => {
  return await prisma.user.update({
    where: { id: Number(id) },
    data: { firstName, lastName, email, password },
  });
};

module.exports = {
  createNewUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  updateUser,
};