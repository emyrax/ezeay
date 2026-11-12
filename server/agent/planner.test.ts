import assert from "node:assert/strict";
import test from "node:test";
import { parsePlannerDecision } from "./planner";

const tools = ["search_materials", "get_progress"];

test("planner accepts a direct answer", () => {
  const decision = parsePlannerDecision(
    { type: "answer", answer: "  Use active recall.  " },
    tools,
  );

  assert.deepEqual(decision, {
    type: "answer",
    answer: "Use active recall.",
    toolCalls: [],
  });
});

test("planner accepts valid tool calls and caps the count", () => {
  const decision = parsePlannerDecision(
    {
      type: "tools",
      toolCalls: [
        { tool: "search_materials", args: { query: "osmosis" } },
        { tool: "get_progress", args: {} },
        { tool: "search_materials", args: { query: "ignored" } },
      ],
    },
    tools,
    2,
  );

  assert.equal(decision?.type, "tools");
  assert.equal(decision?.toolCalls.length, 2);
});

test("planner drops unknown tools and falls back to the answer", () => {
  const decision = parsePlannerDecision(
    {
      type: "tools",
      answer: "I can answer without tools.",
      toolCalls: [{ tool: "delete_everything", args: {} }],
    },
    tools,
  );

  assert.deepEqual(decision, {
    type: "answer",
    answer: "I can answer without tools.",
    toolCalls: [],
  });
});

test("planner supports snake_case tool calls", () => {
  const decision = parsePlannerDecision(
    {
      type: "tools",
      tool_calls: [{ tool: "get_progress", arguments: {} }],
    },
    tools,
  );

  assert.equal(decision?.type, "tools");
  assert.equal(decision?.toolCalls[0].tool, "get_progress");
});

test("planner rejects malformed or empty output", () => {
  assert.equal(parsePlannerDecision(null, tools), null);
  assert.equal(parsePlannerDecision("answer", tools), null);
  assert.equal(parsePlannerDecision({ type: "tools" }, tools), null);
});
