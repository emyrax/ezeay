import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { registerAgentRoutes, type AgentRouteDeps } from "./routes";

function makeDeps(overrides: Partial<AgentRouteDeps> = {}): AgentRouteDeps {
  return {
    db: {} as AgentRouteDeps["db"],
    verifyClerkToken: async () => ({ sub: "user-1" }),
    aiRequestOptions: () => ({ modelRef: "gemini::gemini-2.5-flash" }),
    sendRouteError: (res) => {
      res.status(500).json({ error: "Internal server error" });
    },
    generateJsonContent: async <T>() => ({}) as T,
    generateText: async () => "",
    embed: async () => [1, 0],
    searchKnowledgeChunks: async () => [],
    ...overrides,
  };
}

function makeApp(deps: AgentRouteDeps) {
  const app = express();
  app.use(express.json());
  registerAgentRoutes(app, deps);
  return app;
}

test("agent chat requires an authenticated request", async () => {
  const app = makeApp(
    makeDeps({
      verifyClerkToken: async () => {
        throw new Error("missing token");
      },
      sendRouteError: (res) => {
        res.status(401).json({ error: "Unauthorized" });
      },
    }),
  );

  const response = await request(app).post("/api/agent/chat").send({});

  assert.equal(response.status, 401);
});

test("agent chat rejects a missing message", async () => {
  const response = await request(makeApp(makeDeps()))
    .post("/api/agent/chat")
    .send({ message: "   " });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Missing required field: message");
});
