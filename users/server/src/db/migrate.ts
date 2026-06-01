import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { Sql } from "./connection.ts";

const MIGRATIONS_DIR = join(import.meta.dir, "../../migrations");

async function ensureMigrationsTable(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function isApplied(sql: Sql, name: string): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM migrations WHERE name = ${name}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function migrateUp(sql: Sql): Promise<void> {
  await ensureMigrationsTable(sql);
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries.filter((f) => f.endsWith(".up.sql")).sort();

  for (const name of files) {
    if (await isApplied(sql, name)) {
      console.log(`Skipping migration: ${name} (already applied)`);
      continue;
    }
    const content = await readFile(join(MIGRATIONS_DIR, name), "utf8");
    console.log(`Applying migration: ${name}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO migrations (name) VALUES (${name})`;
    });
  }
}
