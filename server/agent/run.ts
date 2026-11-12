import type {
  AgentPendingAction,
  AgentPlannerDecision,
  AgentRunResult,
  AgentStep,
  AgentToolName,
  AgentToolResult,
} from "../../types/agent";
import type { TutorCitation } from "../../types/tutor";
import type { GenerateTextArgs } from "../../lib/providers/generateText";
import type { TutorHistoryEntry } from "../tutor/sanitize";
import { parsePlannerDecision } from "./planner";
import {
  buildAgentFinalPrompt,
  buildAgentPlannerPrompt,
  toolLabel,
} from "./prompts";
import { dedupeCitations } from "./sanitize";
import type { AgentTool, AgentToolContext } from "./tools";

export interface AgentRunDeps {
  generateJsonContent: <T>(
    modelRef: string,
    prompt: string,
    apiKey?: string,
  ) => Promise<T>;
  generateText: (args: GenerateTextArgs) => Promise<string>;
}

export interface AgentRunInput {
  modelRef: string;
  apiKey?: string;
  system: string;
  question: string;
  history: TutorHistoryEntry[];
  tools: ReadonlyMap<AgentToolName, AgentTool>;
  toolContext: AgentToolContext;
  initialCitations?: TutorCitation[];
  maxToolCalls?: number;
  maxRounds?: number;
  onStep?: (step: AgentStep) => void;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runAgent(
  input: AgentRunInput,
  deps: AgentRunDeps,
): Promise<AgentRunResult> {
  const maxToolCalls = Math.min(Math.max(input.maxToolCalls ?? 0, 0), 2);
  const maxRounds = Math.min(Math.max(input.maxRounds ?? 3, 1), 3);
  const steps: AgentStep[] = [];
  const toolResults: AgentToolResult[] = [];
  const pendingActions: AgentPendingAction[] = [];
  const citations: TutorCitation[] = [...(input.initialCitations ?? [])];
  const allowedTools = [...input.tools.keys()];

  const pushStep = (step: AgentStep) => {
    steps.push(step);
    input.onStep?.(step);
  };

  const completeStep = (
    step: AgentStep,
    status: AgentStep["status"],
    detail?: string,
  ) => {
    const next: AgentStep = { ...step, status, detail };
    const index = steps.findIndex((item) => item.id === step.id);
    if (index >= 0) {
      steps[index] = next;
    } else {
      steps.push(next);
    }
    input.onStep?.(next);
  };

  let answer = "";

  for (let round = 0; round < maxRounds; round += 1) {
    let decision: AgentPlannerDecision | null = null;
    try {
      const prompt = buildAgentPlannerPrompt({
        system: input.system,
        question: input.question,
        history: input.history,
        toolResults,
        tools: [...input.tools.values()].map((tool) => tool.spec),
        maxToolCalls,
      });
      const raw = await deps.generateJsonContent<unknown>(
        input.modelRef,
        prompt,
        input.apiKey,
      );
      decision = parsePlannerDecision(raw, allowedTools, maxToolCalls);
    } catch {
      decision = null;
    }

    if (!decision) break;

    if (decision.type === "answer") {
      answer = decision.answer;
      break;
    }

    for (let index = 0; index < decision.toolCalls.length; index += 1) {
      const call = decision.toolCalls[index];
      const callId = `call_${round + 1}_${index + 1}`;
      const tool = input.tools.get(call.tool);
      const step: AgentStep = {
        id: callId,
        tool: call.tool,
        label: tool?.spec.label ?? toolLabel(call.tool),
        status: "running",
      };
      pushStep(step);

      if (!tool) {
        const summary = `The ${call.tool} tool is not available.`;
        toolResults.push({
          callId,
          tool: call.tool,
          ok: false,
          summary,
          error: "tool_unavailable",
        });
        completeStep(step, "error", summary);
        continue;
      }

      const args = tool.normalizeArgs(call.args);
      if (!args) {
        const summary = `The ${tool.spec.label.toLowerCase()} request was invalid.`;
        toolResults.push({
          callId,
          tool: call.tool,
          ok: false,
          summary,
          error: "invalid_arguments",
        });
        completeStep(step, "error", summary);
        continue;
      }

      try {
        const output = await tool.execute(input.toolContext, args, callId);
        if (output.citations?.length) {
          citations.push(...output.citations);
        }
        if (output.pendingAction) {
          pendingActions.push(output.pendingAction);
        }
        toolResults.push({
          callId,
          tool: call.tool,
          ok: output.ok,
          summary: output.summary,
          data: output.data,
          citations: output.citations,
          error: output.error,
          pendingAction: output.pendingAction,
        });
        completeStep(
          step,
          output.pendingAction
            ? "awaiting_approval"
            : output.ok
              ? "done"
              : "error",
          output.summary,
        );
      } catch (err) {
        const message = errorText(err);
        toolResults.push({
          callId,
          tool: call.tool,
          ok: false,
          summary: "The study tool failed.",
          error: message.slice(0, 500),
        });
        completeStep(step, "error", "The study tool failed.");
      }
    }
  }

  if (!answer.trim()) {
    const prompt = buildAgentFinalPrompt({
      system: input.system,
      question: input.question,
      history: input.history,
      toolResults,
    });
    answer = (
      await deps.generateText({
        modelRef: input.modelRef,
        prompt,
        apiKey: input.apiKey,
        json: false,
      })
    ).trim();
  }

  if (!answer) {
    throw new Error("The agent returned an empty answer.");
  }

  return {
    answer,
    steps,
    citations: dedupeCitations(citations),
    toolResults,
    pendingActions,
  };
}
