import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type postgres from "postgres";

const MIGRATIONS_DIR = join(import.meta.dir, "../../../migrations");

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function isApplied(sql: postgres.Sql, name: string): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM migrations WHERE name = ${name}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function recordMigration(sql: postgres.Sql, name: string) {
  await sql`INSERT INTO migrations (name) VALUES (${name})`;
}

export async function migrateUp(sql: postgres.Sql): Promise<void> {
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
    await sql.unsafe(content);
    await recordMigration(sql, name);
  }
}
