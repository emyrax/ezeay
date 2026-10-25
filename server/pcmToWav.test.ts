import { test } from "node:test";
import assert from "node:assert/strict";
import { pcmRateFromMime, pcmToWav } from "./audio/pcmToWav";

function pcm(samples: number, bitsPerSample = 16, channels = 1): string {
  return Buffer.alloc(
    samples * channels * (bitsPerSample / 8),
  ).toString("base64");
}

test("wraps 24kHz mono PCM in a WAV container", () => {
  const wav = pcmToWav(pcm(24000));
  assert.equal(wav.buffer.length, 44 + 48000);
  assert.equal(wav.buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.buffer.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.buffer.readUInt32LE(24), 24000);
  assert.equal(wav.buffer.readUInt16LE(22), 1);
  assert.equal(wav.buffer.readUInt16LE(34), 16);
  assert.equal(wav.durationMs, 1000);
  assert.equal(wav.mimeType, "audio/wav");
});

test("supports custom sample rates and stereo", () => {
  const wav = pcmToWav(pcm(16000, 16, 2), {
    sampleRate: 16000,
    channels: 2,
  });
  assert.equal(wav.durationMs, 1000);
  assert.equal(wav.buffer.readUInt16LE(22), 2);
  assert.equal(wav.buffer.readUInt32LE(28), 64000);
});

test("strips a data URI prefix", () => {
  const wav = pcmToWav(`data:audio/L16;base64,${pcm(2400)}`);
  assert.equal(wav.durationMs, 100);
});

test("rejects empty, misaligned, and unsupported PCM", () => {
  assert.throws(() => pcmToWav(""));
  assert.throws(() => pcmToWav(Buffer.from([0]).toString("base64")));
  assert.throws(() => pcmToWav(pcm(1), { bitsPerSample: 12 }));
  assert.throws(() => pcmToWav(pcm(1), { channels: 9 }));
});

test("parses the TTS sample rate", () => {
  assert.equal(pcmRateFromMime("audio/L16;codec=pcm;rate=24000"), 24000);
  assert.equal(pcmRateFromMime("audio/L16;codec=pcm;rate=48000"), 48000);
  assert.equal(pcmRateFromMime("audio/wav"), 24000);
  assert.equal(pcmRateFromMime(undefined), 24000);
});
