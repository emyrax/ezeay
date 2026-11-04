export interface NormalizedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface NormalizeQuizOptions {
  maxQuestions?: number;
  minOptions?: number;
  maxOptions?: number;
  requireExactlyFour?: boolean;
  idPrefix?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function quizSource(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  const record = asRecord(input);
  if (!record) return [];
  const direct = Array.isArray(record.questions)
    ? record.questions
    : Array.isArray(record.quiz)
      ? record.quiz
      : null;
  if (direct) return direct;
  const nested = asRecord(record.quiz);
  return nested && Array.isArray(nested.questions) ? nested.questions : [];
}

function readQuestion(value: Record<string, unknown>): string {
  for (const key of ["question", "text", "q"] as const) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return "";
}

function readOptions(value: Record<string, unknown>): string[] {
  if (!Array.isArray(value.options)) return [];
  return value.options
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
}

function readIndex(value: unknown, optionCount: number): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 0 && value < optionCount ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed);
    return index >= 0 && index < optionCount ? index : null;
  }
  return null;
}

function readCorrectAnswer(
  value: Record<string, unknown>,
  options: string[],
): number | null {
  for (const key of ["correctAnswer", "correctAnswerIndex", "correct"] as const) {
    const index = readIndex(value[key], options.length);
    if (index !== null) return index;
  }

  for (const key of ["correctAnswer", "correct", "answer"] as const) {
    const raw = value[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const match = options.findIndex(
      (option) => option.toLowerCase() === raw.trim().toLowerCase(),
    );
    if (match >= 0) return match;
  }

  const answer = value.answer ?? value.correct;
  if (typeof answer === "number") {
    return Number.isInteger(answer) && answer >= 0 && answer < options.length
      ? answer
      : null;
  }
  if (typeof answer !== "string" || !answer.trim()) return null;
  const text = answer.trim();
  const index = readIndex(text, options.length);
  if (index !== null) return index;
  const match = options.findIndex(
    (option) => option.toLowerCase() === text.toLowerCase(),
  );
  return match >= 0 ? match : null;
}

export function normalizeQuizQuestions(
  input: unknown,
  options: NormalizeQuizOptions = {},
): NormalizedQuizQuestion[] {
  const minOptions = options.minOptions ?? 2;
  const maxOptions = options.maxOptions ?? 6;
  const maxQuestions = options.maxQuestions ?? 5;
  const idPrefix = options.idPrefix ?? "q";
  const questions: NormalizedQuizQuestion[] = [];

  for (const [index, raw] of quizSource(input).entries()) {
    if (questions.length >= maxQuestions) break;
    const value = asRecord(raw);
    if (!value) continue;

    const question = readQuestion(value);
    const allOptions = readOptions(value);
    if (!question || allOptions.length < minOptions) continue;

    const allowedOptions = options.requireExactlyFour
      ? allOptions.length === 4
        ? allOptions
        : []
      : allOptions.slice(0, maxOptions);
    if (allowedOptions.length < minOptions) continue;

    const correctAnswer = readCorrectAnswer(value, allowedOptions);
    if (correctAnswer === null) continue;

    const id =
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `${idPrefix}${index + 1}`;
    const explanation =
      typeof value.explanation === "string"
        ? value.explanation.trim()
        : typeof value.rationale === "string"
          ? value.rationale.trim()
          : "";

    questions.push({
      id,
      question,
      options: allowedOptions,
      correctAnswer,
      explanation,
    });
  }

  return questions;
}
