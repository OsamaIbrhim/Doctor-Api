const request = require("supertest");
const app = require("../index");

describe("GET /doc", () => {
  test("should respond with status 200 and return a doctor", async () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjMyZmJkMWQ2OTVhZTk0NWU5ZWYyNmQiLCJpYXQiOjE3MTQ2MTcyOTh9.KkBnbFS7TW5zwHSr8cI906w68tFGJSE7imPF7ERpFT0";
    const response = (await request(app).get("/doc")).set(
      "Authorization",
      `Bearer ${token}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("email");
  });
});
