import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { registerTutorRoutes, type TutorRouteDeps } from "./routes";

function makeApp(overrides: Partial<TutorRouteDeps> = {}) {
  const app = express();
  app.use(express.json());
  const deps = {
    verifyClerkToken: async () => ({ sub: "user_1" }),
    aiRequestOptions: () => ({ modelRef: "gemini::gemini-2.5-flash" }),
    sendRouteError: (res: express.Response, err: unknown) =>
      res.status(500).json({ error: err instanceof Error ? err.message : "error" }),
    generateQuizQuestions: async () => [
      {
        id: "q1",
        question: "What is 2 + 2?",
        options: ["1", "2", "3", "4"],
        correctAnswer: 3,
        explanation: "2 + 2 = 4.",
      },
    ],
    ...overrides,
  } as unknown as TutorRouteDeps;

  registerTutorRoutes(app, deps);
  return app;
}

test("POST /api/tutor/quiz validates the topic before generating", async () => {
  let called = false;
  const app = makeApp({
    generateQuizQuestions: async () => {
      called = true;
      return [];
    },
  });

  const res = await request(app).post("/api/tutor/quiz").send({ topic: "ab" });

  assert.equal(res.status, 400);
  assert.equal(called, false);
});

test("POST /api/tutor/quiz returns generated questions", async () => {
  const app = makeApp();
  const res = await request(app)
    .post("/api/tutor/quiz")
    .send({ topic: "Chemical bonding", examType: "WAEC" });

  assert.equal(res.status, 200);
  assert.equal(res.body.quiz.topic, "Chemical bonding");
  assert.equal(res.body.quiz.questions.length, 1);
  assert.equal(res.body.quiz.questions[0].correctAnswer, 3);
});

test("POST /api/tutor/quiz sanitizes a custom exam into the prompt", async () => {
  let prompt = "";
  const app = makeApp({
    generateQuizQuestions: async (_model, nextPrompt) => {
      prompt = nextPrompt;
      return [
        {
          id: "q1",
          question: "What is 2 + 2?",
          options: ["1", "2", "3", "4"],
          correctAnswer: 3,
          explanation: "2 + 2 = 4.",
        },
      ];
    },
  });

  const res = await request(app)
    .post("/api/tutor/quiz")
    .send({ topic: "Chemical bonding", examType: "  West African   Mock  " });

  assert.equal(res.status, 200);
  assert.match(prompt, /West African Mock/);
});
