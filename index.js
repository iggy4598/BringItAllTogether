const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { prisma } = require("./common");
const {
  createNewUser,
  getUserByEmail,
  getUserById,
  updateUser,
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "1234";
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const setToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "8h" });

const isLoggedIn = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    req.user = await getUserById(id);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin)
    return res.status(403).json({ message: "Admin access required" });
  next();
};
// my public endpoints. it allows people to see the reviews without having to login
app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { user: true, item: true, comments: true },
    });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      include: { reviews: true, category: true },
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
    res.status(500).json({ message: "Error fetching items" });
  }
});

app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        reviews: { include: { user: true, comments: true } },
        category: true,
      },
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    item.averageRating = item.reviews.length
      ? item.reviews.reduce((sum, review) => sum + review.rating, 0) /
        item.reviews.length
      : "No ratings yet";
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Error fetching item" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { query, category } = req.query;
    const whereClause = {
      name: { contains: query || "", mode: "insensitive" },
      ...(category && {
        category: { name: { equals: category, mode: "insensitive" } },
      }),
    };
    const items = await prisma.item.findMany({
      where: whereClause,
      include: { reviews: true, category: true },
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error searching items" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createNewUser(
      firstName,
      lastName,
      email,
      hashedPassword
    );
    const token = setToken(user.id);
    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === "P2002") {
      res.status(400).json({ message: "Email already in use" });
    } else {
      res.status(500).json({ message: "Error registering user" });
    }
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(403).json({ message: "Invalid credentials" });
    const token = setToken(user.id);
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});
app.delete("/api/users/:id", isLoggedIn, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.user.id && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this profile" });
    }
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting profile" });
  }
});

//this is where my protected endpoint starts! you need to be granted access to use!
app.get("/api/aboutMe", isLoggedIn, (req, res) => {
  const { id, firstName, lastName, email, isAdmin } = req.user;
  res.status(200).json({ id, firstName, lastName, email, isAdmin });
});

app.put("/api/users/:id", isLoggedIn, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorized" });
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    const data = { firstName, lastName, email };
    if (hashedPassword) data.password = hashedPassword;
    const updatedUser = await updateUser(
      req.params.id,
      data.firstName,
      data.lastName,
      data.email,
      data.password
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating profile" });
  }
});
//this is where the reviews start.
app.post("/api/items/:id/reviews", isLoggedIn, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const existingReview = await prisma.review.findFirst({
      where: { itemId, userId: req.user.id },
    });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "Review already exists for this item by the user" });
    }
    const { rating, text, image } = req.body;
    const review = await prisma.review.create({
      data: {
        rating,
        text,
        image,
        item: { connect: { id: itemId } },
        user: { connect: { id: req.user.id } },
      },
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: "Error creating review" });
  }
});

app.put("/api/reviews/:reviewId", isLoggedIn, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this review" });
    }
    const { rating, text, image } = req.body;
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { rating, text, image },
    });
    res.status(200).json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: "Error updating review" });
  }
});

app.delete("/api/reviews/:reviewId", isLoggedIn, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this review" });
    }
    await prisma.review.delete({ where: { id: reviewId } });
    res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting review" });
  }
});
// this is the comments
app.post("/api/reviews/:id/comments", isLoggedIn, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { text } = req.body;
    const comment = await prisma.comment.create({
      data: {
        text,
        review: { connect: { id: reviewId } },
        user: { connect: { id: req.user.id } },
      },
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment" });
  }
});

app.put("/api/comments/:commentId", isLoggedIn, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this comment" });
    }
    const { text } = req.body;
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { text },
    });
    res.status(200).json(updatedComment);
  } catch (error) {
    res.status(500).json({ message: "Error updating comment" });
  }
});

app.delete("/api/comments/:commentId", isLoggedIn, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }
    await prisma.comment.delete({ where: { id: commentId } });
    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment" });
  }
});

app.get("/api/users/:id/reviews", isLoggedIn, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const reviews = await prisma.review.findMany({
      where: { userId: Number(req.params.id) },
      include: { item: true },
    });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user's reviews" });
  }
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;