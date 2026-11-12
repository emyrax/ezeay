import assert from "node:assert/strict";
import test from "node:test";
import {
  groupPlanByWeek,
  planSlotKey,
  planSummary,
  planTaskInputs,
  planTaskTitle,
} from "./plan";
import type { TutorPlan } from "../../types/tutor";

const plan: TutorPlan = {
  examType: "WAEC",
  examDate: "2026-06-01",
  timezone: "Africa/Lagos",
  slots: [
    { date: "2026-05-04", title: "Mathematics practice", minutes: 45, subject: "Mathematics" },
    { date: "2026-05-06", title: "Biology revision", minutes: 30, subject: "Biology" },
    { date: "2026-05-10", title: "Mathematics practice", minutes: 45, subject: "Mathematics" },
    { date: "2026-05-11", title: "Chemistry revision", minutes: 60, subject: "Chemistry" },
  ],
};

test("planSummary reports sessions, time, and subjects", () => {
  const summary = planSummary(plan);
  assert.equal(summary.sessions, 4);
  assert.equal(summary.totalMinutes, 180);
  assert.deepEqual(summary.subjects, ["Mathematics", "Biology", "Chemistry"]);
  assert.equal(summary.firstDate, "2026-05-04");
  assert.equal(summary.lastDate, "2026-05-11");
});

test("groupPlanByWeek groups Monday to Sunday", () => {
  const weeks = groupPlanByWeek(plan);
  assert.equal(weeks.length, 2);
  assert.deepEqual(
    weeks[0].slots.map(planSlotKey),
    [
      "2026-05-04|Mathematics practice",
      "2026-05-06|Biology revision",
      "2026-05-10|Mathematics practice",
    ],
  );
  assert.equal(weeks[1].slots.length, 1);
});

test("planTaskInputs skips saved slots and duplicate schedule tasks", () => {
  const firstSlot = plan.slots[0];
  const duplicateTitle = planTaskTitle(plan.slots[1]);
  const result = planTaskInputs(
    plan,
    [{ date: "2026-05-06", title: duplicateTitle }],
    [planSlotKey(firstSlot)],
    "18:00",
  );

  assert.equal(result.tasks.length, 2);
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.keys, [
    "2026-05-10|Mathematics practice",
    "2026-05-11|Chemistry revision",
  ]);
  assert.deepEqual(result.tasks[0], {
    date: "2026-05-10",
    title: "Mathematics practice (45 min)",
    time: "18:00",
  });
});

test("planTaskInputs returns an empty list when everything is saved", () => {
  const result = planTaskInputs(
    plan,
    plan.slots.map((slot) => ({ date: slot.date, title: planTaskTitle(slot) })),
    [],
  );

  assert.equal(result.tasks.length, 0);
  assert.equal(result.skipped, 4);
});
