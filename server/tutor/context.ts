import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "../../db/schema";
import { studyMaterials } from "../../db/schema";
import { chunkText, cosineSimilarity, type KnowledgeChunk } from "../rag";

export type TutorContextDb = NeonHttpDatabase<typeof schema>;

export interface CollectContextsDeps {
  db: TutorContextDb;
  embed: (text: string) => Promise<number[]>;
  searchKnowledgeChunks: (
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit?: number,
  ) => Promise<KnowledgeChunk[]>;
}

export async function collectContexts(
  deps: CollectContextsDeps,
  userId: string,
  question: string,
  materialIds: string[],
  noteTexts: { title: string; content: string }[],
): Promise<{ contexts: KnowledgeChunk[]; queryEmbedding: number[] | null }> {
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await deps.embed(question);
  } catch {
    queryEmbedding = null;
  }

  const contexts: KnowledgeChunk[] = [];

  if (queryEmbedding) {
    const chunks = await deps.searchKnowledgeChunks(
      userId,
      queryEmbedding,
      ["material"],
      materialIds.length > 0 ? materialIds : undefined,
      6,
    );
    contexts.push(...chunks);
  }

  if (queryEmbedding && materialIds.length > 0 && contexts.length === 0) {
    const rows = await deps.db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        extractedContent: studyMaterials.extractedContent,
        summary: studyMaterials.summary,
      })
      .from(studyMaterials)
      .where(
        and(eq(studyMaterials.userId, userId), inArray(studyMaterials.id, materialIds)),
      );
    for (const row of rows) {
      const text = (row.extractedContent || row.summary || "").slice(0, 6000);
      if (!text.trim()) continue;
      contexts.push({
        id: `fallback_${row.id}`,
        title: row.title,
        content: text,
        sourceType: "material",
        sourceId: row.id,
      });
    }
  }

  if (queryEmbedding && noteTexts.length > 0) {
    const scored: { text: string; source: string; sim: number }[] = [];
    for (const note of noteTexts.slice(0, 5)) {
      const chunks = chunkText(note.content).slice(0, 6);
      for (const chunk of chunks) {
        const embedding = await deps.embed(chunk).catch(() => null);
        if (!embedding) continue;
        scored.push({
          text: chunk,
          source: `${note.title} (note)`,
          sim: cosineSimilarity(queryEmbedding, embedding),
        });
      }
    }
    scored.sort((a, b) => b.sim - a.sim);
    for (const item of scored.slice(0, 3)) {
      contexts.push({
        id: `note_${contexts.length}`,
        title: item.source,
        content: item.text,
        sourceType: "note",
        sourceId: "",
      });
    }
  }

  return { contexts, queryEmbedding };
}
