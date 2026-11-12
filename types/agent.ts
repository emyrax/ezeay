import type {
  TutorCitation,
  TutorMessage,
  TutorMode,
  TutorPersona,
} from "./tutor";

export type AgentToolName =
  | "search_materials"
  | "get_progress"
  | "list_papers"
  | "remember_fact"
  | "save_plan"
  | "save_routine"
  | "update_schedule_task"
  | "cancel_schedule_task"
  | "list_connected_actions"
  | "run_connected_action";

export type AgentToolApproval = "auto" | "confirm" | "disabled";

export type AgentToolScope =
  | "materials"
  | "progress"
  | "papers"
  | "memory"
  | "schedule"
  | "routines";

export type AgentToolExecution = "server" | "client";

export interface AgentToolSpec {
  name: AgentToolName;
  label: string;
  description: string;
  scope: AgentToolScope;
  approval: AgentToolApproval;
  execution?: AgentToolExecution;
  parameters: Record<string, unknown>;
}

export interface AgentScheduleTaskInput {
  date: string;
  title: string;
  time?: string;
  durationMinutes?: number;
  subject?: string;
  notes?: string;
}

export interface AgentScheduleContext {
  id: string;
  date: string;
  title: string;
  time?: string;
  durationMinutes?: number;
  subject?: string;
}

export interface AgentScheduleUpdate {
  taskId: string;
  date?: string;
  title?: string;
  time?: string | null;
  durationMinutes?: number | null;
  subject?: string | null;
  notes?: string | null;
}

export interface AgentProfile {
  id: string;
  name: string;
  avatar: string;
  instructions: string;
  persona: TutorPersona;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileInput {
  name: string;
  avatar?: string;
  instructions: string;
  persona?: TutorPersona;
}

export interface AgentIntegration {
  toolkit: string;
  status: "disconnected" | "pending" | "connected" | "error";
  connectedAccountId: string | null;
  updatedAt: string | null;
}

export interface AgentIntegrationToolkit {
  id: string;
  name: string;
  description: string;
  status: "disconnected" | "pending" | "connected" | "error";
  connectedAccountId: string | null;
  updatedAt: string | null;
  actions: {
    action: string;
    slug: string;
    description: string;
    scope: string;
    approval: AgentToolApproval;
    read: boolean;
    write: boolean;
  }[];
}

export interface AgentIntegrationsResponse {
  configured: boolean;
  toolkits: AgentIntegrationToolkit[];
}

export interface AgentIntegrationConnectResponse {
  toolkit: AgentIntegrationToolkit;
  redirectUrl: string;
  connectedAccountId: string;
  expiresAt: string;
}

export type AgentRoutineFrequency = "daily" | "weekly";

export interface AgentRoutineInput {
  title: string;
  prompt: string;
  frequency: AgentRoutineFrequency;
  time: string;
  days?: number[];
  timezone?: string;
  toolScopes?: AgentToolScope[];
}

export interface AgentRoutine {
  id: string;
  title: string;
  prompt: string;
  scheduleCron: string;
  timezone: string;
  toolScopes: string[];
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRoutineRun {
  id: string;
  routineId: string;
  routineTitle: string;
  status: string;
  output: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AgentExecutionRecord {
  id: string;
  kind: "tool" | "routine";
  title: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdAt: string;
}

export interface AgentPendingAction {
  id: string;
  tool: AgentToolName;
  label: string;
  summary: string;
  args: Record<string, unknown>;
  execution: AgentToolExecution;
  createdAt: string;
}

export type AgentActionStatus = "success" | "error" | "rejected";

export interface AgentActionResolution {
  id: string;
  tool: AgentToolName;
  status: AgentActionStatus;
  summary?: string;
  error?: string;
}

export interface AgentActionResult {
  action: AgentActionResolution;
}

export interface AgentMemoryRecord {
  id: string;
  kind: string;
  content: string;
  fileName: string | null;
  mimeType: string | null;
  fileUrl: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryInput {
  kind?: string;
  content: string;
}

export interface AgentMemoryUpdateInput {
  kind?: string;
  content?: string;
}

export interface AgentMemoryUploadInput {
  base64: string;
  filename: string;
  mimeType?: string;
  kind?: string;
  content?: string;
}

export interface AgentToolCall {
  id: string;
  tool: AgentToolName;
  args: Record<string, unknown>;
}

export interface AgentToolResult {
  callId: string;
  tool: AgentToolName;
  ok: boolean;
  summary: string;
  data?: unknown;
  citations?: TutorCitation[];
  error?: string;
  pendingAction?: AgentPendingAction;
}

export type AgentStepStatus = "running" | "done" | "error" | "awaiting_approval";

export interface AgentStep {
  id: string;
  tool?: AgentToolName;
  label: string;
  status: AgentStepStatus;
  detail?: string;
}

export interface AgentChatInput {
  conversationId?: string;
  agentId?: string;
  message: string;
  persona?: TutorPersona;
  mode?: TutorMode;
  examType?: string;
  materialIds?: string[];
  memoryIds?: string[];
  noteTexts?: { title?: string; content: string }[];
  schedule?: AgentScheduleContext[];
  stream?: boolean;
}

export interface AgentChatResponse {
  conversationId: string;
  agentId: string | null;
  userMessageId: string;
  message: TutorMessage;
  steps: AgentStep[];
  pendingActions: AgentPendingAction[];
}

export interface AgentChatStreamStep {
  type: "step";
  step: AgentStep;
}

export interface AgentChatStreamDone {
  type: "done";
  conversationId: string;
  agentId: string | null;
  userMessageId: string;
  message: TutorMessage;
  steps: AgentStep[];
  pendingActions: AgentPendingAction[];
}

export interface AgentChatStreamError {
  type: "error";
  message: string;
  code?: string;
}

export type AgentStreamEvent =
  | AgentChatStreamStep
  | AgentChatStreamDone
  | AgentChatStreamError;

export interface AgentPlannerToolCall {
  tool: AgentToolName;
  args: Record<string, unknown>;
}

export type AgentPlannerDecision =
  | { type: "answer"; answer: string; toolCalls: [] }
  | { type: "tools"; answer: string; toolCalls: AgentPlannerToolCall[] };

export interface AgentRunResult {
  answer: string;
  steps: AgentStep[];
  citations: TutorCitation[];
  toolResults: AgentToolResult[];
  pendingActions: AgentPendingAction[];
}
