const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());
const PORT = 3000;
app.use(require("morgan")("dev"));
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "1234";

const { prisma } = require("./common");
const {
  createNewUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  deleteUser,
  updateUser,
} = require("./db");

const setToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "8h" });

const isLoggedIn = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    req.user = await getUserById(id);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/api/items", async (req, res, next) => {
  try {
    const items = await prisma.item.findMany({
      include: { reviews: true },
    });

    const itemsWithRatings = items.map((item) => ({
      ...item,
      averageRating: item.reviews.length
        ? item.reviews.reduce((sum, review) => sum + review.rating, 0) /
          item.reviews.length
        : "No ratings yet",
    }));

    res.status(200).json(itemsWithRatings);
  } catch (error) {
    next(error);
  }
});

app.get("/api/items/:id", async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: Number(req.params.id) },
      include: { reviews: true },
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    item.averageRating = item.reviews.length
      ? item.reviews.reduce((sum, review) => sum + review.rating, 0) /
        item.reviews.length
      : "No ratings yet";

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

app.get("/api/search", async (req, res, next) => {
  try {
    const { query } = req.query;

    const items = await prisma.item.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      include: { reviews: true },
    });

    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
});

app.post("/api/register", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createNewUser(firstName, lastName, email, hashedPassword);
    const token = setToken(user.id);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = setToken(user.id);
      res.status(200).json({ token, user });
    } else {
      res.status(403).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/aboutMe", isLoggedIn, (req, res) => {
  const { id, firstName, lastName, email } = req.user;
  res.status(200).json({ id, firstName, lastName, email });
});

app.get("/api/users", isLoggedIn, async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id", isLoggedIn, async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", isLoggedIn, async (req, res, next) => {
  try {
    await deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:id", isLoggedIn, async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await updateUser(
      req.params.id,
      firstName,
      lastName,
      email,
      hashedPassword
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`I am on port ${PORT}`);
});