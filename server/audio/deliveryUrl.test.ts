import { test } from "node:test";
import assert from "node:assert/strict";
import { lessonAudioDeliveryUrl } from "./deliveryUrl";

test("delivers uploaded WAV lessons as MP3", () => {
  assert.equal(
    lessonAudioDeliveryUrl(
      "https://res.cloudinary.com/demo/video/upload/v123/lesson.wav",
    ),
    "https://res.cloudinary.com/demo/video/upload/f_mp3/v123/lesson.mp3",
  );
});

test("preserves query strings", () => {
  assert.equal(
    lessonAudioDeliveryUrl(
      "https://res.cloudinary.com/demo/video/upload/v123/lesson.wav?v=1",
    ),
    "https://res.cloudinary.com/demo/video/upload/f_mp3/v123/lesson.mp3?v=1",
  );
});

test("leaves non-video URLs unchanged", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/v123/cover.png";
  assert.equal(lessonAudioDeliveryUrl(url), url);
});

test("does not apply the MP3 transform twice", () => {
  const url =
    "https://res.cloudinary.com/demo/video/upload/f_mp3/v123/lesson.mp3";
  assert.equal(lessonAudioDeliveryUrl(url), url);
});
