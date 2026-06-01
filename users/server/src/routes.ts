import { Hono } from "hono";
import type { Config } from "./config.ts";
import { connectDb } from "./db/connection.ts";
import type { Deps } from "./deps.ts";
import { authProtectedRoutes, authRoutes } from "./handlers/auth.ts";
import { adminRoutes } from "./handlers/admin.ts";
import { authzRoutes } from "./handlers/authz.ts";
import { healthRoutes } from "./handlers/health.ts";
import { passwordResetRoutes } from "./handlers/passwordReset.ts";
import { userAdminRoutes, userSelfRoutes } from "./handlers/user.ts";
import { createMailer } from "./mail/smtp.ts";
import {
  adminMiddleware,
  authMiddleware,
  forcePasswordChangeMiddleware,
  type AppVariables,
} from "./middleware/auth.ts";
import { corsMiddleware } from "./middleware/cors.ts";
import { rateLimit } from "./middleware/rateLimit.ts";

export function createApp(cfg: Config) {
  const sql = connectDb(cfg);
  const mailer = createMailer(cfg);
  const deps: Deps = { sql, cfg, mailer, intranetName: "home.muffled intranet" };

  const app = new Hono();

  if (cfg.corsOrigins.length) {
    app.use("*", corsMiddleware(cfg.corsOrigins));
  }

  app.use("/v1/auth/login", rateLimit({ windowMs: 60_000, max: 10 }));
  app.use("/v1/auth/forgot-password", rateLimit({ windowMs: 15 * 60_000, max: 5 }));
  app.use("/v1/auth/reset-password", rateLimit({ windowMs: 15 * 60_000, max: 10 }));

  app.route("/", healthRoutes(deps));
  app.route("/", authRoutes(deps));
  app.route("/", passwordResetRoutes(deps));

  const auth = authMiddleware(cfg.jwtSecret);
  const force = forcePasswordChangeMiddleware();
  const admin = adminMiddleware();

  const authed = new Hono<{ Variables: AppVariables }>();
  authed.use("*", auth);
  authed.route("/", authProtectedRoutes(deps));

  const forced = new Hono<{ Variables: AppVariables }>();
  forced.use("*", force);
  forced.route("/", userSelfRoutes(deps));
  forced.route("/", authzRoutes(deps));

  const adminOnly = new Hono<{ Variables: AppVariables }>();
  adminOnly.use("*", admin);
  adminOnly.route("/", userAdminRoutes(deps));
  adminOnly.route("/", adminRoutes(deps));
  forced.route("/", adminOnly);

  authed.route("/", forced);
  app.route("/", authed);

  return { app, sql };
}
