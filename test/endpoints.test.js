const request = require("supertest");
const app = require("../index"); 
const { prisma } = require("../common");

describe("Backend Endpoints", () => {
  let token;
  let userId;
  let itemId;
  let reviewId;
  let commentId;

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        firstName: "Test",
        lastName: "User",
        email: "testuser@example.com",
        password: "password123"
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("token");
    token = res.body.token;
    userId = res.body.user.id;
  });

  it("should login with registered user", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({
        email: "testuser@example.com",
        password: "password123"
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token;
  });

  it("should get all items", async () => {
    const res = await request(app).get("/api/items");
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      itemId = res.body[0].id;
    }
  });

  it("should create a review for an item", async () => {
    const res = await request(app)
      .post(`/api/items/${itemId}/reviews`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 4,
        text: "Great product!",
        image: ""
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id");
    reviewId = res.body.id;
  });

  it("should not allow duplicate review for the same item by the same user", async () => {
    const res = await request(app)
      .post(`/api/items/${itemId}/reviews`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 3,
        text: "Another review attempt",
        image: ""
      });
    expect(res.statusCode).toEqual(400);
  });

  it("should update the review", async () => {
    const res = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 5,
        text: "Updated review text",
        image: ""
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.text).toEqual("Updated review text");
  });

  it("should add a comment to the review", async () => {
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Nice review!"
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id");
    commentId = res.body.id;
  });
  it("should update the comment", async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Updated comment text"
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.text).toEqual("Updated comment text");
  });

  it("should delete the comment", async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
  });

  it("should delete the review", async () => {
    const res = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
  });

  it("should fetch reviews by the user", async () => {
    const res = await request(app)
      .get(`/api/users/${userId}/reviews`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: "testuser@example.com" }
  });
  await prisma.$disconnect();
});

//