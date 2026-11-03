import assert from "node:assert/strict";
import { test } from "node:test";
import {
  focusItemFromPost,
  focusProgress,
  nextRecommendedFocus,
  quizStatusFor,
} from "./selectors";
import type { FocusSubtopic, ThreadQuizSession } from "../../types/learning";
import type { ThreadPost } from "../../types/thread";

const post: ThreadPost = {
  id: "subtopic:course_1:0:1",
  authorId: "user_1",
  author: {
    id: "user_1",
    name: "Ada",
    avatarUrl: null,
    handle: "ada-1234",
    bio: null,
    iqScore: 120,
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
    isChallenged: false,
  },
  courseId: "course_1",
  courseTitle: "Math",
  chapterId: "course_1:0",
  chapterIndex: 0,
  chapterTitle: "Algebra",
  subtopicIndex: 1,
  partNumber: 2,
  subtopicCount: 3,
  subtopicTitle: "Quadratics",
  subtopicDetails: "Full details",
  content: "Preview",
  examCategory: "WAEC",
  mediaType: "visual_lesson",
  mediaUrl: null,
  attachments: [],
  likesCount: 0,
  commentsCount: 0,
  isLikedByMe: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const item = focusItemFromPost(post);

test("focusItemFromPost carries stable identity and quiz context", () => {
  assert.equal(item.id, post.id);
  assert.equal(item.courseTitle, "Math");
  assert.equal(item.summary, "Preview");
  assert.ok(item.addedAt);
});

test("focusProgress and nextRecommendedFocus use passed state", () => {
  const items: FocusSubtopic[] = [
    { ...item, id: "a" },
    { ...item, id: "b" },
  ];
  const passed = (value: FocusSubtopic) => value.id === "a";
  assert.deepEqual(focusProgress(items, passed), { completed: 1, total: 2, percent: 50 });
  assert.equal(nextRecommendedFocus(items, passed)?.id, "b");
});

test("quizStatusFor derives pill state", () => {
  const session = (overrides: Partial<ThreadQuizSession>): ThreadQuizSession => ({
    status: "idle",
    questions: [],
    attempted: false,
    lastScore: null,
    generatedAt: null,
    error: null,
    ...overrides,
  });
  const generated = session({
    status: "ready",
    questions: [
      {
        id: "q1",
        question: "Q",
        options: ["A", "B", "C", "D"],
        correctAnswerIndex: 0,
        explanation: "",
      },
    ],
  });

  assert.equal(quizStatusFor(undefined, true, undefined), "passed");
  assert.equal(quizStatusFor(session({ status: "generating" }), false, undefined), "generating");
  assert.equal(quizStatusFor(generated, false, undefined), "ready");
  assert.equal(quizStatusFor({ ...generated, attempted: true, lastScore: 60 }, false, 60), "failed");
  assert.equal(quizStatusFor(undefined, false, 40), "failed");
  assert.equal(quizStatusFor(undefined, false, undefined), "unattempted");
});
