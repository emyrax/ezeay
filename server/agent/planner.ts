import type {
  AgentPlannerDecision,
  AgentPlannerToolCall,
  AgentToolName,
} from "../../types/agent";
import { asRecord, cleanText } from "./sanitize";

function parseCalls(
  raw: unknown,
  allowedTools: Set<string>,
  maxCalls: number,
): AgentPlannerToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: AgentPlannerToolCall[] = [];
  for (const item of raw) {
    const entry = asRecord(item);
    if (!entry) continue;
    const tool = cleanText(entry.tool, 40) as AgentToolName;
    const args = asRecord(entry.args) ?? asRecord(entry.arguments);
    if (!tool || !args || !allowedTools.has(tool)) continue;
    calls.push({ tool, args });
    if (calls.length >= maxCalls) break;
  }
  return calls;
}

export function parsePlannerDecision(
  raw: unknown,
  allowedTools: string[],
  maxCalls = 2,
): AgentPlannerDecision | null {
  const entry = asRecord(raw);
  if (!entry) return null;

  const answer = cleanText(entry.answer, 8000);
  const calls = parseCalls(
    entry.toolCalls ?? entry.tool_calls,
    new Set(allowedTools),
    maxCalls,
  );

  if (calls.length > 0) {
    return { type: "tools", answer, toolCalls: calls };
  }

  if (answer) {
    return { type: "answer", answer, toolCalls: [] };
  }

  return null;
}
