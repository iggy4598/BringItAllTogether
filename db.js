const { prisma } = require("./common");

const createNewUser = async (firstName, lastName, email, password) => {
  const response = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password,
    },
  });
  return response;
};

const getUserByEmail = async (email) => {
  const response = await prisma.user.findFirstOrThrow({
    where: { email },
  });
  return response;
};

const getUserById = async (id) => {
  const response = await prisma.user.findFirstOrThrow({
    where: { id },
  });
  return response;
};

const getAllUsers = async () => {
  const response = await prisma.user.findMany();
  return response;
};

const deleteUser = async (id) => {
  const response = await prisma.user.delete({
    where: { id },
  });
  return response;
};

const updateUser = async (id, firstName, lastName, email, password) => {
  const response = await prisma.user.update({
    where: { id },
    data: {
      firstName,
      lastName,
      email,
      password,
    },
  });
  return response;
};

module.exports = {
  createNewUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  deleteUser,
  updateUser,
};
