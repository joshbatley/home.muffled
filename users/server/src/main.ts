import { loadConfig, logConfig } from "./config.ts";
import { migrateUp } from "./db/migrate.ts";
import { createApp } from "./routes.ts";
import { seedAdmin, seedDefaults } from "./seed/seed.ts";

const seedOnly = process.argv.includes("--seed-admin");

async function main() {
  const cfg = loadConfig();
  logConfig(cfg);
  const { app, sql } = createApp(cfg);

  await migrateUp(sql);
  await seedDefaults(sql);
  await seedAdmin(sql, cfg.seedEmail, cfg.seedPassword, cfg.bcryptCost);

  if (seedOnly) {
    console.log("seed complete");
    await sql.end();
    return;
  }

  console.log(`listening on :${cfg.port}`);
  Bun.serve({
    port: Number(cfg.port),
    fetch: app.fetch,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
