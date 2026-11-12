import assert from "node:assert/strict";
import test from "node:test";
import type { ThreadPost, ThreadUser } from "../../types/thread";
import {
  getCurrentStreak,
  getRecommendedLearners,
  getWeekActivity,
} from "./activity";

const today = new Date("2026-11-05T12:00:00Z");

test("getCurrentStreak counts consecutive active days through today", () => {
  assert.equal(
    getCurrentStreak(
      [
        { date: "2026-11-03", count: 2 },
        { date: "2026-11-04", count: 1 },
        { date: "2026-11-05", count: 4 },
      ],
      today,
    ),
    3,
  );
});

test("getCurrentStreak stops at the first inactive day", () => {
  assert.equal(
    getCurrentStreak(
      [
        { date: "2026-11-02", count: 1 },
        { date: "2026-11-04", count: 1 },
        { date: "2026-11-05", count: 1 },
      ],
      today,
    ),
    2,
  );
});

test("getWeekActivity returns seven days ending today", () => {
  const week = getWeekActivity(
    [
      { date: "2026-10-30", count: 1 },
      { date: "2026-11-05", count: 5 },
    ],
    today,
  );
  assert.equal(week.length, 7);
  assert.equal(week[0].key, "2026-10-30");
  assert.equal(week[0].count, 1);
  assert.equal(week[6].key, "2026-11-05");
  assert.equal(week[6].count, 5);
  assert.equal(week[3].count, 0);
});

test("getRecommendedLearners excludes the viewer and ranks by audience", () => {
  const viewer = makeUser("viewer", 0, 0);
  const small = makeUser("small", 12, 110);
  const large = makeUser("large", 42, 120);
  const posts = [
    makePost("p1", viewer),
    makePost("p2", small),
    makePost("p3", large),
    makePost("p4", small),
  ];

  const result = getRecommendedLearners(posts, viewer.id, 2);
  assert.deepEqual(
    result.map((item) => item.user.id),
    ["large", "small"],
  );
});

function makeUser(id: string, followersCount: number, iqScore: number): ThreadUser {
  return {
    id,
    name: id,
    avatarUrl: null,
    handle: id,
    bio: null,
    iqScore,
    followersCount,
    followingCount: 0,
    isFollowing: false,
    isChallenged: false,
  };
}

function makePost(id: string, author: ThreadUser): ThreadPost {
  return {
    id,
    authorId: author.id,
    author,
    courseId: "course",
    courseTitle: "Course",
    chapterId: "chapter",
    chapterIndex: 0,
    chapterTitle: "Chapter",
    subtopicIndex: 0,
    subtopicTitle: "Subtopic",
    body: "",
    createdAt: "",
    likesCount: 0,
    commentsCount: 0,
    likedByMe: false,
    isFocus: false,
  } as unknown as ThreadPost;
}
