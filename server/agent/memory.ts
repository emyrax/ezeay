import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import * as schema from "../../db/schema";
import { agentMemories } from "../../db/schema";
import { cleanText, sanitizeUntrustedText } from "./sanitize";

export type AgentMemoryDb = NeonHttpDatabase<typeof schema>;

export interface AgentMemory {
  kind: string;
  content: string;
}

export interface AgentMemoryRecord extends AgentMemory {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  fileUrl: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryFile extends AgentMemoryRecord {
  extractedText: string;
}

export interface AgentMemoryInput {
  kind?: unknown;
  content?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  fileUrl?: unknown;
  sizeBytes?: unknown;
  extractedText?: unknown;
}

function toRecord(row: typeof agentMemories.$inferSelect): AgentMemoryRecord {
  return {
    id: row.id,
    kind: cleanText(row.kind, 40) || "fact",
    content: cleanText(row.content, 400),
    fileName: cleanText(row.fileName, 200) || null,
    mimeType: cleanText(row.mimeType, 120) || null,
    fileUrl: cleanText(row.fileUrl, 500) || null,
    sizeBytes: row.sizeBytes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadAgentMemories(
  db: AgentMemoryDb,
  userId: string,
  limit = 8,
): Promise<AgentMemory[]> {
  const rows = await db
    .select({
      kind: agentMemories.kind,
      content: agentMemories.content,
    })
    .from(agentMemories)
    .where(and(eq(agentMemories.userId, userId), isNull(agentMemories.fileUrl)))
    .orderBy(desc(agentMemories.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 20));

  return rows
    .map((row) => ({
      kind: cleanText(row.kind, 40) || "fact",
      content: cleanText(row.content, 400),
    }))
    .filter((row) => row.content.length > 0);
}

export async function listAgentMemories(
  db: AgentMemoryDb,
  userId: string,
  limit = 50,
): Promise<AgentMemoryRecord[]> {
  const rows = await db
    .select()
    .from(agentMemories)
    .where(eq(agentMemories.userId, userId))
    .orderBy(desc(agentMemories.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  return rows
    .map(toRecord)
    .filter((row) => row.content.length > 0 || Boolean(row.fileUrl));
}

export async function createAgentMemory(
  db: AgentMemoryDb,
  userId: string,
  input: AgentMemoryInput,
): Promise<AgentMemoryRecord> {
  const [row] = await db
    .insert(agentMemories)
    .values({
      userId,
      kind: cleanText(input.kind, 40) || (input.fileUrl ? "file" : "fact"),
      content: cleanText(input.content, 400),
      fileName: cleanText(input.fileName, 200) || null,
      mimeType: cleanText(input.mimeType, 120) || null,
      fileUrl: cleanText(input.fileUrl, 500) || null,
      sizeBytes:
        typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
          ? Math.max(0, Math.trunc(input.sizeBytes))
          : null,
      extractedText: input.extractedText
        ? sanitizeUntrustedText(String(input.extractedText), 20000)
        : null,
    })
    .returning();
  if (!row) throw new Error("Could not save that memory.");
  return toRecord(row);
}

export async function updateAgentMemory(
  db: AgentMemoryDb,
  userId: string,
  memoryId: string,
  input: Pick<AgentMemoryInput, "kind" | "content">,
): Promise<AgentMemoryRecord | null> {
  const values: { kind?: string; content?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (input.kind !== undefined) {
    values.kind = cleanText(input.kind, 40) || "fact";
  }
  if (input.content !== undefined) {
    values.content = cleanText(input.content, 400);
  }

  const [row] = await db
    .update(agentMemories)
    .set(values)
    .where(and(eq(agentMemories.id, memoryId), eq(agentMemories.userId, userId)))
    .returning();
  return row ? toRecord(row) : null;
}

export async function loadTaggedMemoryFiles(
  db: AgentMemoryDb,
  userId: string,
  memoryIds: string[],
): Promise<AgentMemoryFile[]> {
  if (memoryIds.length === 0) return [];
  const rows = await db
    .select()
    .from(agentMemories)
    .where(and(eq(agentMemories.userId, userId), inArray(agentMemories.id, memoryIds)))
    .limit(12);

  return rows
    .map((row) => {
      const record = toRecord(row);
      return {
        ...record,
        extractedText: sanitizeUntrustedText(row.extractedText ?? "", 20000),
      };
    })
    .filter((row) => Boolean(row.fileUrl) && (row.extractedText || row.content));
}

export async function deleteAgentMemory(
  db: AgentMemoryDb,
  userId: string,
  memoryId: string,
): Promise<boolean> {
  const [row] = await db
    .delete(agentMemories)
    .where(and(eq(agentMemories.id, memoryId), eq(agentMemories.userId, userId)))
    .returning({ id: agentMemories.id });
  return Boolean(row);
}

export function formatMemories(memories: AgentMemory[]): string {
  if (memories.length === 0) return "No saved learner facts yet.";
  return memories
    .map((memory) => `- [${memory.kind}] ${memory.content}`)
    .join("\n");
}
