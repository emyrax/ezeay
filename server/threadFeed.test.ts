import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_THREAD_ATTACHMENT_BYTES,
  buildChapterId,
  buildResourcePostId,
  buildSubtopicPostId,
  deriveHandle,
  deriveIqScore,
  flattenCourseSubtopics,
  mapResourceToThreadItem,
  parseChapterId,
  parseThreadPostId,
  seededRank,
} from "./threadFeed";

test("deriveHandle is stable and readable", () => {
  assert.equal(deriveHandle("Ada Lovelace", "user_abc12345"), "adalovelace-2345");
  assert.equal(deriveHandle(null, "user_abcd"), "scholar-abcd");
  assert.equal(deriveHandle("  Chidi!! ", "user_9f3a1"), "chidi-f3a1");
});

test("deriveIqScore grows with xp and caps at 200", () => {
  assert.equal(deriveIqScore(0), 100);
  assert.ok(deriveIqScore(100) > 100);
  assert.equal(deriveIqScore(1_000_000), 200);
});

test("subtopic post ids round-trip with colons in course ids", () => {
  const id = buildSubtopicPostId("course:with:colons", 2, 7);
  assert.deepEqual(parseThreadPostId(id), {
    kind: "subtopic",
    courseId: "course:with:colons",
    chapterIndex: 2,
    subtopicIndex: 7,
  });
});

test("resource and invalid post ids are parsed safely", () => {
  assert.deepEqual(parseThreadPostId(buildResourcePostId("resource_1")), {
    kind: "resource",
    resourceId: "resource_1",
  });
  assert.equal(parseThreadPostId("not-a-post"), null);
  assert.equal(parseThreadPostId("subtopic:course:bad:index"), null);
});

test("chapter ids round-trip", () => {
  const key = buildChapterId("course_1", 3);
  assert.deepEqual(parseChapterId(key), { courseId: "course_1", chapterIndex: 3 });
  assert.equal(parseChapterId("nope"), null);
});

test("seeded rank is deterministic and seed-dependent", () => {
  const a = seededRank(42, "subtopic:course:0:0");
  const b = seededRank(42, "subtopic:course:0:0");
  const c = seededRank(43, "subtopic:course:0:0");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("flattening skips own courses and private chapters for other viewers", () => {
  const chapters = JSON.stringify([
    {
      title: "Algebra",
      subtopics: [{ title: "Linear", content: "Solve for x" }, { title: "Quadratic", content: "Roots" }],
    },
    {
      title: "Secret",
      isPrivate: true,
      subtopics: [{ title: "Hidden", content: "Nope" }],
    },
  ]);
  const course = {
    id: "course_1",
    title: "Math",
    category: "WAEC",
    creatorId: "user_1",
    creatorName: "Ada",
    creatorAvatar: null,
    chapters,
    sharedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const items = flattenCourseSubtopics(course, { viewerId: "user_2", includeMine: false });
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "subtopic:course_1:0:0");
  assert.equal(items[0].partNumber, 1);
  assert.equal(items[0].subtopicCount, 2);
  assert.equal(items[0].examCategory, "WAEC");

  const own = flattenCourseSubtopics(course, { viewerId: "user_1", includeMine: false });
  assert.equal(own.length, 0);

  const ownerView = flattenCourseSubtopics(course, { viewerId: "user_1", includeMine: true });
  assert.equal(ownerView.length, 3);
});

test("resource mapping enforces the 5 MB attachment limit", () => {
  const base = {
    id: "resource_1",
    userId: "user_1",
    authorName: "Ada",
    authorAvatar: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const small = mapResourceToThreadItem({
    ...base,
    body: JSON.stringify({
      title: "Cheatsheet",
      summary: "Key formulas",
      resourceType: "pdf",
      storageUrl: "https://example.com/a.pdf",
      fileSizeBytes: MAX_THREAD_ATTACHMENT_BYTES,
      mimeType: "application/pdf",
    }),
  });
  assert.ok(small);
  assert.equal(small?.attachments.length, 1);
  assert.equal(small?.attachments[0].type, "pdf");

  const large = mapResourceToThreadItem({
    ...base,
    body: JSON.stringify({
      title: "Too big",
      summary: "Nope",
      resourceType: "pdf",
      storageUrl: "https://example.com/b.pdf",
      fileSizeBytes: MAX_THREAD_ATTACHMENT_BYTES + 1,
      mimeType: "application/pdf",
    }),
  });
  assert.ok(large);
  assert.equal(large?.attachments.length, 0);
});
