import assert from "node:assert/strict";
import test from "node:test";
import type { AgentToolName } from "../../types/agent";
import type { AgentRunDeps } from "./run";
import { runAgent } from "./run";
import type { AgentTool, AgentToolContext } from "./tools";

const toolContext = {
  userId: "user-1",
  db: {} as AgentToolContext["db"],
  embed: async () => [1, 0],
  searchKnowledgeChunks: async () => [],
};

function makeTool(
  name: AgentToolName,
  execute: AgentTool["execute"],
  normalizeArgs: AgentTool["normalizeArgs"] = (raw) =>
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : null,
): AgentTool {
  return {
    spec: {
      name,
      label: name,
      description: name,
      scope: "materials",
      approval: "auto",
      parameters: {},
    },
    normalizeArgs,
    execute,
  };
}

function plannerDeps(responses: unknown[], final = "Final answer"): AgentRunDeps {
  let index = 0;
  return {
    generateJsonContent: async <T>() => {
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return response as T;
    },
    generateText: async () => final,
  };
}

test("runAgent returns a direct planner answer without calling tools", async () => {
  const result = await runAgent(
    {
      modelRef: "gemini::gemini-2.5-flash",
      system: "system",
      question: "What is osmosis?",
      history: [],
      tools: new Map(),
      toolContext,
      maxToolCalls: 0,
    },
    plannerDeps([{ type: "answer", answer: "Osmosis is water movement." }]),
  );

  assert.equal(result.answer, "Osmosis is water movement.");
  assert.equal(result.steps.length, 0);
  assert.equal(result.toolResults.length, 0);
});

test("runAgent executes a tool, emits steps, and keeps citations", async () => {
  const tool = makeTool("search_materials", async () => ({
    ok: true,
    summary: "Found one passage.",
    citations: [{ quote: "Water moves.", source: "Biology note" }],
  }));
  const statuses: string[] = [];

  const result = await runAgent(
    {
      modelRef: "gemini::gemini-2.5-flash",
      system: "system",
      question: "Find osmosis",
      history: [],
      tools: new Map([["search_materials", tool]]),
      toolContext,
      maxToolCalls: 2,
      onStep: (step) => statuses.push(step.status),
    },
    plannerDeps([
      {
        type: "tools",
        toolCalls: [{ tool: "search_materials", args: { query: "osmosis" } }],
      },
      { type: "answer", answer: "Your note says water moves." },
    ]),
  );

  assert.equal(result.answer, "Your note says water moves.");
  assert.equal(result.toolResults.length, 1);
  assert.equal(result.citations.length, 1);
  assert.deepEqual(statuses, ["running", "done"]);
});

test("runAgent falls back to a final answer when the planner fails", async () => {
  const deps: AgentRunDeps = {
    generateJsonContent: async () => {
      throw new Error("planner unavailable");
    },
    generateText: async () => "A grounded fallback answer.",
  };

  const result = await runAgent(
    {
      modelRef: "gemini::gemini-2.5-flash",
      system: "system",
      question: "Help me study",
      history: [],
      tools: new Map(),
      toolContext,
      maxToolCalls: 0,
    },
    deps,
  );

  assert.equal(result.answer, "A grounded fallback answer.");
});

test("runAgent stops after three rounds and produces a final answer", async () => {
  const tool = makeTool("get_progress", async () => ({
    ok: true,
    summary: "Progress loaded.",
  }));

  const result = await runAgent(
    {
      modelRef: "gemini::gemini-2.5-flash",
      system: "system",
      question: "What should I study?",
      history: [],
      tools: new Map([["get_progress", tool]]),
      toolContext,
      maxToolCalls: 2,
    },
    plannerDeps(
      [
        { type: "tools", toolCalls: [{ tool: "get_progress", args: {} }] },
        { type: "tools", toolCalls: [{ tool: "get_progress", args: {} }] },
        { type: "tools", toolCalls: [{ tool: "get_progress", args: {} }] },
      ],
      "Final study advice.",
    ),
  );

  assert.equal(result.answer, "Final study advice.");
  assert.equal(result.toolResults.length, 3);
  assert.equal(result.steps.length, 3);
});

test("runAgent records invalid tool arguments as an error step", async () => {
  const tool = makeTool(
    "search_materials",
    async () => ({ ok: true, summary: "should not run" }),
    () => null,
  );

  const result = await runAgent(
    {
      modelRef: "gemini::gemini-2.5-flash",
      system: "system",
      question: "Search",
      history: [],
      tools: new Map([["search_materials", tool]]),
      toolContext,
      maxToolCalls: 2,
    },
    plannerDeps([
      {
        type: "tools",
        toolCalls: [{ tool: "search_materials", args: { query: "x" } }],
      },
      { type: "answer", answer: "I could not search your materials." },
    ]),
  );

  assert.equal(result.toolResults.length, 1);
  assert.equal(result.toolResults[0].ok, false);
  assert.equal(result.toolResults[0].error, "invalid_arguments");
  assert.equal(result.steps[0].status, "error");
});
