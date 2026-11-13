import assert from "node:assert/strict";
import test from "node:test";
import type { TutorConversation } from "../../types/tutor";
import { filterConversations } from "./historyFilter";

const conversations: TutorConversation[] = [
  {
    id: "1",
    title: "Photosynthesis basics",
    persona: "patient_tutor",
    mode: "general",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "2",
    title: "Cell structure review",
    persona: "patient_tutor",
    mode: "materials",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "3",
    title: "",
    persona: "patient_tutor",
    mode: "materials",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-06T00:00:00.000Z",
  },
];

test("returns every conversation for an empty query", () => {
  assert.equal(filterConversations(conversations, "", "all").length, 3);
});

test("searches titles case-insensitively", () => {
  const result = filterConversations(conversations, "PHOTO", "all");
  assert.deepEqual(result.map((item) => item.id), ["1"]);
});

test("matches the untitled fallback", () => {
  const result = filterConversations(conversations, "untitled", "all");
  assert.deepEqual(result.map((item) => item.id), ["3"]);
});

test("filters by mode", () => {
  const result = filterConversations(conversations, "", "materials");
  assert.deepEqual(result.map((item) => item.id), ["2", "3"]);
});

test("combines search and mode filters", () => {
  const result = filterConversations(conversations, "cell", "materials");
  assert.deepEqual(result.map((item) => item.id), ["2"]);
});

test("returns an empty list when nothing matches", () => {
  assert.deepEqual(filterConversations(conversations, "history", "all"), []);
});
