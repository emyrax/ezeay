import assert from "node:assert/strict";
import test from "node:test";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
  agentIntegrations,
  agentMemories,
  agentPracticeAttempts,
  agentRoutineRuns,
  agentRoutines,
  agentSyllabusProgress,
  agentToolRuns,
  studyMaterials,
  tutorPreferences,
} from "../../db/schema";

test("agent platform tables are defined", () => {
  const tables = [
    agentMemories,
    agentIntegrations,
    agentRoutines,
    agentRoutineRuns,
    agentToolRuns,
    agentPracticeAttempts,
    agentSyllabusProgress,
  ];

  assert.deepEqual(
    tables.map((table) => getTableName(table)),
    [
      "agent_memories",
      "agent_integrations",
      "agent_routines",
      "agent_routine_runs",
      "agent_tool_runs",
      "agent_practice_attempts",
      "agent_syllabus_progress",
    ],
  );
});

test("past paper metadata is optional and defaults to non-paper", () => {
  const columns = getTableColumns(studyMaterials);

  assert.equal(columns.examBoard.notNull, false);
  assert.equal(columns.examYear.notNull, false);
  assert.equal(columns.paperCode.notNull, false);
  assert.equal(columns.paperType.notNull, false);
  assert.equal(columns.durationMinutes.notNull, false);
  assert.equal(columns.isPastPaper.notNull, true);
  assert.equal(columns.isPastPaper.default, false);
});

test("practice attempts support topic-only practice", () => {
  const columns = getTableColumns(agentPracticeAttempts);

  assert.equal(columns.materialId.notNull, false);
  assert.equal(columns.topic.notNull, false);
  assert.equal(columns.idempotencyKey.notNull, true);
});

test("agent preferences expose timezone and daily tool limit", () => {
  const columns = getTableColumns(tutorPreferences);

  assert.equal(columns.timezone.notNull, true);
  assert.equal(columns.timezone.default, "Africa/Lagos");
  assert.equal(columns.dailyToolLimit.notNull, true);
  assert.equal(columns.dailyToolLimit.default, 20);
});
