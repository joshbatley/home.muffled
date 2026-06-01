import postgres from "postgres";
import type { Config } from "../config.ts";

export function connectDb(cfg: Config) {
  return postgres(cfg.databaseUrl);
}

export type Sql = ReturnType<typeof connectDb>;
