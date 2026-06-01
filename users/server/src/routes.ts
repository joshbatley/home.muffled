import { Hono } from "hono";
import type { Config } from "./config.ts";
import { connectDb } from "./db/connection.ts";
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

export function createApp(cfg: Config) {
  const sql = connectDb(cfg);
  const mailer = createMailer(cfg);
  const deps = { sql, cfg, mailer, intranetName: "home.muffled intranet" };
  const authDeps = { sql, cfg };

  const app = new Hono();

  if (cfg.corsOrigins.length) {
    app.use("*", corsMiddleware(cfg.corsOrigins));
  }

  app.route("/", healthRoutes(sql));
  app.route("/", authRoutes(authDeps));
  app.route("/", passwordResetRoutes({ sql, cfg, mailer }));

  const auth = authMiddleware(cfg.jwtSecret);
  const force = forcePasswordChangeMiddleware();
  const admin = adminMiddleware();

  const authed = new Hono<{ Variables: AppVariables }>();
  authed.use("*", auth);
  authed.route("/", authProtectedRoutes(authDeps));

  const forced = new Hono<{ Variables: AppVariables }>();
  forced.use("*", force);
  forced.route("/", userSelfRoutes(deps));
  forced.route("/", authzRoutes(sql));

  const adminOnly = new Hono<{ Variables: AppVariables }>();
  adminOnly.use("*", admin);
  adminOnly.route("/", userAdminRoutes(deps));
  adminOnly.route("/", adminRoutes(sql));
  forced.route("/", adminOnly);

  authed.route("/", forced);
  app.route("/", authed);

  return { app, sql };
}
