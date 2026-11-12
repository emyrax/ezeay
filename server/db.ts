import "dotenv/config";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

const DATABASE_URL =
  process.env.NEON_DATABASE_URL ??
  (process.env.NODE_ENV === "test"
    ? "postgresql://test:test@127.0.0.1:5432/test"
    : undefined);

if (!DATABASE_URL) {
  console.error("[Server] Missing NEON_DATABASE_URL");
  process.exit(1);
}

export const hasDatabase = Boolean(process.env.NEON_DATABASE_URL);

export const DB_HOST = (() => {
  try {
    return new URL(DATABASE_URL).host;
  } catch {
    return "unknown";
  }
})();

const rawSql = neon(DATABASE_URL);

neonConfig.fetchFunction = (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => {
  const timeoutSignal = AbortSignal.timeout(15000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(url, { ...init, signal });
};

function isTransientDbError(err: unknown): boolean {
  if (!err) return false;
  const message = `${(err as { message?: string })?.message ?? ""} ${
    (err as { code?: string })?.code ?? ""
  }`;
  return (
    /fetch failed/i.test(message) ||
    /ConnectTimeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|AbortError|TimeoutError|UND_ERR_|aborted due to timeout/i.test(
      message,
    )
  );
}

async function runWithRetry<T>(run: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (err) {
      if (!isTransientDbError(err) || attempt >= 2) throw err;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

export const sql = Object.assign(
  (...args: Parameters<typeof rawSql>) => runWithRetry(() => rawSql(...args)),
  {
    query: (...args: Parameters<typeof rawSql.query>) =>
      runWithRetry(() => rawSql.query(...args)),
  },
) as typeof rawSql;

export const db = drizzle(sql, { schema });

export type ServerDb = typeof db;
