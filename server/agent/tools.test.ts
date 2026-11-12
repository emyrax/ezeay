import assert from "node:assert/strict";
import test from "node:test";
import { getAgentTool, getAgentToolSpecs } from "./tools";

test("agent tool specs are hidden when tools are disabled", () => {
  assert.deepEqual(getAgentToolSpecs(false), []);
  assert.equal(getAgentToolSpecs(true).length, 10);
});

test("search_materials normalizes args and rejects empty queries", () => {
  const tool = getAgentTool("search_materials");
  assert.ok(tool);

  assert.deepEqual(
    tool.normalizeArgs({
      query: "  photosynthesis  ",
      materialIds: ["a", "a", "b", 3],
      limit: 99,
    }),
    {
      query: "photosynthesis",
      materialIds: ["a", "b"],
      limit: 8,
    },
  );
  assert.equal(tool.normalizeArgs({ query: " " }), null);
});

test("get_progress accepts optional course ids only", () => {
  const tool = getAgentTool("get_progress");
  assert.ok(tool);

  assert.deepEqual(tool.normalizeArgs({}), { courseId: null });
  assert.deepEqual(tool.normalizeArgs({ courseId: " course-1 " }), {
    courseId: "course-1",
  });
});

test("list_papers clamps year and limit", () => {
  const tool = getAgentTool("list_papers");
  assert.ok(tool);

  assert.deepEqual(
    tool.normalizeArgs({ board: "WAEC", year: 1200, limit: 500 }),
    {
      board: "WAEC",
      year: 1950,
      subject: null,
      limit: 20,
    },
  );
});

test("save_plan normalizes dated tasks and requires valid dates", () => {
  const tool = getAgentTool("save_plan");
  assert.ok(tool);

  assert.deepEqual(
    tool.normalizeArgs({
      tasks: [
        {
          date: "2026-11-12",
          title: "Revise biology",
          time: "18:30",
          durationMinutes: 60,
          subject: "Biology",
          notes: "Focus on photosynthesis.",
        },
      ],
      reminderMinutes: 10,
    }),
    {
      target: "local",
      tasks: [
        {
          date: "2026-11-12",
          title: "Revise biology",
          time: "18:30",
          durationMinutes: 60,
          subject: "Biology",
          notes: "Focus on photosynthesis.",
        },
      ],
      reminderMinutes: 10,
    },
  );
  assert.equal(tool.normalizeArgs({ tasks: [{ date: "2026-13-01", title: "Bad" }] }), null);
});

test("schedule task updates and cancellations normalize ids", () => {
  const update = getAgentTool("update_schedule_task");
  const cancel = getAgentTool("cancel_schedule_task");
  assert.ok(update);
  assert.ok(cancel);

  assert.deepEqual(update.normalizeArgs({ taskId: "task-1", title: "Revise chemistry" }), {
    taskId: "task-1",
    title: "Revise chemistry",
  });
  assert.deepEqual(cancel.normalizeArgs({ taskIds: ["task-1", "task-1"] }), {
    taskIds: ["task-1"],
  });
});
