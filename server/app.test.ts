import { before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.NO_LISTEN = "1";

let app: Express;

before(async () => {
  ({ app } = await import("./index"));
});

test("unknown requests still carry a request id", async () => {
  const res = await request(app).get("/api/notes");
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid token");
  assert.match(res.headers["x-request-id"] ?? "", /^[A-Za-z0-9-]+$/);
});

test("unmatched routes return a JSON route_not_found error", async () => {
  const res = await request(app).get("/api/definitely-not-a-route");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "route_not_found");
  assert.equal(res.body.error, "Route not found");
  assert.match(res.body.requestId ?? "", /^[A-Za-z0-9-]+$/);
});

test("CORS allows the web app origin", async () => {
  const res = await request(app)
    .options("/api/notes")
    .set("Origin", "http://localhost:3000")
    .set("Access-Control-Request-Method", "GET");
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.match(res.headers["access-control-allow-headers"] ?? "", /Idempotency-Key/i);
});

test("CORS does not reflect unlisted origins", async () => {
  const res = await request(app)
    .options("/api/notes")
    .set("Origin", "https://evil.example")
    .set("Access-Control-Request-Method", "GET");
  assert.equal(res.headers["access-control-allow-origin"], undefined);
});

test("uploads require auth or a signed token", async () => {
  const res = await request(app).get("/uploads/does-not-exist.pdf");
  assert.equal(res.status, 401);
});

test("POST /api/uploads validates auth before body", async () => {
  const res = await request(app).post("/api/uploads").send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "unauthorized");
});

test("bulk import is auth-gated", async () => {
  const res = await request(app).post("/api/notes/import").send({ notes: [] });
  assert.equal(res.status, 401);
});

test("note ids are validated before touching the database", async () => {
  const res = await request(app).get("/api/notes/not-a-uuid");
  assert.equal(res.status, 401);
});

test("idempotency is required to be short", async () => {
  const res = await request(app)
    .post("/api/bounties/claim")
    .set("Idempotency-Key", "x".repeat(200))
    .send({});
  assert.equal(res.status, 401);
});

test("spin status is auth-gated", async () => {
  const res = await request(app).get("/api/spin/status");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "unauthorized");
  assert.match(res.headers["x-request-id"] ?? "", /^[A-Za-z0-9-]+$/);
});

test("spin validates auth before touching the database", async () => {
  const res = await request(app)
    .post("/api/spin")
    .set("Idempotency-Key", "spin-1")
    .send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "unauthorized");
});

test("animated lesson reads are auth-gated", async () => {
  const res = await request(app).get("/api/courses/course-1/lessons/0/0");
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid token");
});

test("animated lesson generation is auth-gated", async () => {
  const res = await request(app)
    .post("/api/courses/course-1/lessons/0/0/generate")
    .send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid token");
});

test("lesson audio generation is auth-gated", async () => {
  const res = await request(app)
    .post("/api/lessons/lsn_00000000/audio")
    .send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid token");
});

test("lesson explanations are auth-gated", async () => {
  const res = await request(app)
    .post("/api/lessons/lsn_00000000/explain")
    .send({ slideId: "s1", action: "simplify" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid token");
});
