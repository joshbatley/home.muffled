export type Config = {
  port: string;
  databaseUrl: string;
  jwtSecret: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
  passwordResetTtlMs: number;
  seedEmail: string;
  seedPassword: string;
  logLevel: string;
  corsOrigins: string[];
  publicBaseUrl: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  mailFrom: string;
};

function envOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function parseDurationMs(key: string, defaultMs: number): number {
  const v = process.env[key];
  if (!v) return defaultMs;
  const units: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };
  let total = 0;
  const re = /(\d+)(ms|s|m|h)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v)) !== null) {
    total += Number(m[1]) * units[m[2]]!;
  }
  if (total === 0) throw new Error(`invalid ${key}`);
  return total;
}

function parseCorsOrigins(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function loadConfig(): Config {
  const cfg: Config = {
    port: envOrDefault("PORT", "8080"),
    databaseUrl: process.env.DATABASE_URL ?? "",
    jwtSecret: process.env.JWT_SECRET ?? "",
    accessTokenTtlMs: parseDurationMs("ACCESS_TOKEN_TTL", 15 * 60 * 1000),
    refreshTokenTtlMs: parseDurationMs("REFRESH_TOKEN_TTL", 7 * 24 * 60 * 60 * 1000),
    passwordResetTtlMs: parseDurationMs("PASSWORD_RESET_TTL", 60 * 60 * 1000),
    seedEmail: process.env.SEED_EMAIL ?? "",
    seedPassword: process.env.SEED_PASSWORD ?? "",
    logLevel: envOrDefault("LOG_LEVEL", "info"),
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, ""),
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: envOrDefault("SMTP_PORT", "587"),
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPassword: process.env.SMTP_PASSWORD ?? "",
    mailFrom: process.env.MAIL_FROM ?? "",
  };

  if (!cfg.databaseUrl) throw new Error("DATABASE_URL is required");
  if (!cfg.jwtSecret) throw new Error("JWT_SECRET is required");
  if (!cfg.seedEmail) throw new Error("SEED_EMAIL is required");
  if (!cfg.seedPassword) throw new Error("SEED_PASSWORD is required");

  return cfg;
}

export function mailConfigured(cfg: Config): boolean {
  return !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPassword && cfg.mailFrom);
}

export function logConfig(cfg: Config): void {
  console.log("Config loaded:");
  console.log(`  PORT=${cfg.port}`);
  console.log(`  ACCESS_TOKEN_TTL=${cfg.accessTokenTtlMs}ms`);
  console.log(`  REFRESH_TOKEN_TTL=${cfg.refreshTokenTtlMs}ms`);
  console.log(`  LOG_LEVEL=${cfg.logLevel}`);
  if (cfg.publicBaseUrl) console.log(`  PUBLIC_BASE_URL=${cfg.publicBaseUrl}`);
  if (cfg.corsOrigins.length) console.log(`  CORS_ORIGINS=${cfg.corsOrigins.join(",")}`);
  if (cfg.smtpHost) console.log(`  SMTP_HOST=${cfg.smtpHost} (mail enabled)`);
  else console.log("  SMTP not configured (transactional email disabled)");
}
