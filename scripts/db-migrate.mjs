import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "drizzle");

const url = process.env.NEON_DATABASE_URL;
if (!url) {
  console.error("[migrate] Missing NEON_DATABASE_URL");
  process.exit(1);
}

const journalPath = path.join(migrationsDir, "meta", "_journal.json");
if (!fs.existsSync(journalPath)) {
  console.error(`[migrate] Missing ${journalPath}`);
  process.exit(1);
}

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const sql = neon(url);

async function main() {
  await sql.query("create schema if not exists drizzle");
  await sql.query(
    "create table if not exists drizzle.__drizzle_migrations (" +
      "id serial primary key, hash text not null, created_at bigint)",
  );

  const rows = await sql.query(
    "select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1",
  );
  const lastWhen = rows[0] ? Number(rows[0].created_at) : null;

  let applied = 0;
  for (const entry of journal.entries) {
    if (lastWhen !== null && lastWhen >= entry.when) continue;

    const file = path.join(migrationsDir, `${entry.tag}.sql`);
    const content = fs.readFileSync(file, "utf8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const statements = content
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.query(statement);
    }
    await sql.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
      [hash, entry.when],
    );
    console.log(`[migrate] applied ${entry.tag}`);
    applied += 1;
  }

  console.log(applied ? `[migrate] done (${applied} applied)` : "[migrate] up to date");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[migrate] failed:", error?.message ?? error);
    process.exit(1);
  });
