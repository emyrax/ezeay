import { api, friendlyError } from "../api";
import { normalizeQuizQuestions } from "../quiz/normalize";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
} from "../providers/offline";
import { shapeToSchema } from "../offline/jsonSchema";
import type { TutorQuiz, TutorQuizInput, TutorQuizQuestion } from "../../types/tutor";
import { buildOfflineTutorQuizPrompt } from "./prompt";

function toQuestion(input: {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}): TutorQuizQuestion {
  return {
    id: input.id,
    question: input.question,
    options: input.options,
    correctAnswer: input.correctAnswer,
    ...(input.explanation ? { explanation: input.explanation } : {}),
  };
}

async function generateOfflineQuiz(
  input: TutorQuizInput,
  modelRef: string,
): Promise<TutorQuiz> {
  await ensureOfflineActivated(modelRef);
  const prompt = buildOfflineTutorQuizPrompt({
    topic: input.topic,
    examType: input.examType ?? "",
    persona: input.persona ?? "patient_tutor",
    noteTexts: input.noteTexts,
  });
  const data = await offlineGenerateObject<unknown>(
    shapeToSchema(prompt.jsonShape),
    { system: prompt.system },
  );
  const questions = normalizeQuizQuestions(data, {
    maxQuestions: 5,
    requireExactlyFour: true,
    idPrefix: "offline_tutor_q_",
  });

  if (questions.length < 3) {
    throw new Error(
      "The on-device model returned an incomplete quiz. Try again or switch models.",
    );
  }

  return { topic: input.topic, questions: questions.map(toQuestion) };
}

export async function generateTutorQuiz(
  input: TutorQuizInput,
  getToken: () => Promise<string | null>,
  modelRef: string,
): Promise<TutorQuiz> {
  if (isOfflineRef(modelRef)) {
    try {
      return await generateOfflineQuiz(input, modelRef);
    } catch (err) {
      throw new Error(modelErrorMessage(err) || "Quiz generation failed");
    }
  }

  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const res = await api.tutor.quiz(input, token, { modelRef });
    const questions = Array.isArray(res.quiz?.questions) ? res.quiz.questions : [];
    if (questions.length === 0) {
      throw new Error("No questions generated. Try again in a moment.");
    }
    return { ...res.quiz, questions };
  } catch (err) {
    throw new Error(friendlyError(err, "Quiz generation failed"));
  }
}
