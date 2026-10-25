export interface PcmToWavOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
}

export interface WavAudio {
  buffer: Buffer;
  base64: string;
  durationMs: number;
  mimeType: "audio/wav";
}

const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_CHANNELS = 1;
const DEFAULT_BITS_PER_SAMPLE = 16;

function positiveInt(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function stripDataUri(value: string): string {
  const comma = value.indexOf(",");
  if (value.startsWith("data:") && comma !== -1) {
    return value.slice(comma + 1);
  }
  return value;
}

export function pcmRateFromMime(mimeType: string | undefined): number {
  const match = /rate=(\d+)/i.exec(mimeType ?? "");
  const rate = match ? Number(match[1]) : 0;
  return Number.isInteger(rate) && rate >= 8000 && rate <= 48000
    ? rate
    : DEFAULT_SAMPLE_RATE;
}

export function pcmToWav(
  pcmBase64: string,
  options: PcmToWavOptions = {},
): WavAudio {
  if (typeof pcmBase64 !== "string" || !pcmBase64.trim()) {
    throw new Error("Empty PCM audio");
  }

  const sampleRate = positiveInt(options.sampleRate, DEFAULT_SAMPLE_RATE);
  const channels = positiveInt(options.channels, DEFAULT_CHANNELS);
  const bitsPerSample = positiveInt(
    options.bitsPerSample,
    DEFAULT_BITS_PER_SAMPLE,
  );

  if (channels > 8) throw new Error("Unsupported PCM channel count");
  if (![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new Error("Unsupported PCM bit depth");
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const pcm = Buffer.from(stripDataUri(pcmBase64), "base64");

  if (pcm.length === 0) throw new Error("Invalid PCM audio");
  if (pcm.length % blockAlign !== 0) {
    throw new Error("PCM audio is not aligned to whole samples");
  }
  if (pcm.length > 0xffffffff - 36) {
    throw new Error("PCM audio is too large to wrap in a WAV container");
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  const buffer = Buffer.concat([header, pcm]);
  return {
    buffer,
    base64: buffer.toString("base64"),
    durationMs: Math.round((pcm.length / byteRate) * 1000),
    mimeType: "audio/wav",
  };
}
