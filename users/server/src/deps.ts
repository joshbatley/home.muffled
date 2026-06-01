import type { Config } from "./config.ts";
import type { Sql } from "./db/connection.ts";
import type { Mailer } from "./mail/smtp.ts";

export type Deps = {
  sql: Sql;
  cfg: Config;
  mailer: Mailer;
  intranetName: string;
};
