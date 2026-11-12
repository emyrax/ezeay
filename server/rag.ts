import { randomUUID } from "crypto";

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string;
}

export type RagSql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>;

interface KnowledgeChunkRow {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_id: string;
}

export function chunkText(text: string, maxLength = 1500, overlap = 150): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  const paragraphs = clean.split(/\n\n+/);
  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
      let rest = trimmed;
      while (rest.length > maxLength) {
        chunks.push(rest.slice(0, maxLength));
        rest = rest.slice(maxLength - overlap);
      }
      current = rest;
      continue;
    }
    const candidate = current.trim() ? `${current}\n\n${trimmed}` : trimmed;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      chunks.push(current.trim());
      current = trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface RagDeps {
  sql: RagSql;
  embed: (text: string) => Promise<number[]>;
}

export function createRag({ sql, embed }: RagDeps) {
  async function upsertKnowledgeChunks(
    userId: string,
    sourceType: string,
    sourceId: string,
    title: string,
    content: string,
  ): Promise<void> {
    const chunks = chunkText(content);
    if (chunks.length === 0) return;

    await sql`DELETE FROM knowledge_chunks WHERE user_id = ${userId} AND source_type = ${sourceType} AND source_id = ${sourceId}`;

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i]).catch(() => null);
      if (!embedding) continue;
      const id = `kc_${randomUUID()}`;
      await sql`
        INSERT INTO knowledge_chunks (id, user_id, source_type, source_id, title, content, chunk_index, embedding)
        VALUES (${id}, ${userId}, ${sourceType}, ${sourceId}, ${title}, ${chunks[i]}, ${i}, ${JSON.stringify(embedding)}::vector)
      `;
    }
  }

  async function searchKnowledgeChunks(
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit = 6,
  ): Promise<KnowledgeChunk[]> {
    const typeFilter =
      sourceTypes.length > 0 ? sql`AND source_type IN (${sourceTypes})` : sql``;
    const idFilter =
      sourceIds && sourceIds.length > 0 ? sql`AND source_id IN (${sourceIds})` : sql``;
    const vec = JSON.stringify(queryEmbedding);

    const result = await sql`
      SELECT id, title, content, source_type, source_id
      FROM knowledge_chunks
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
        ${typeFilter}
        ${idFilter}
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${limit}
    `;

    const rows = result as KnowledgeChunkRow[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      sourceType: r.source_type,
      sourceId: r.source_id,
    }));
  }

  return { upsertKnowledgeChunks, searchKnowledgeChunks };
}
