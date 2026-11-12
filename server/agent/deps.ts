import { db, sql } from "../db";
import { generateJsonContent, generateQuizQuestions } from "../../lib/gemini";
import { generateText } from "../../lib/providers/generateText";

export const agentDeps = {
  db,
  sql,
  generateJsonContent,
  generateQuizQuestions,
  generateText,
};

export type AgentDeps = typeof agentDeps;
