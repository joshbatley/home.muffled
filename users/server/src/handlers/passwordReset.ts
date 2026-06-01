import { Hono } from "hono";
import { hashPassword } from "../auth/password.ts";
import { generateRefreshToken, hashRefreshToken } from "../auth/refresh.ts";
import { MIN_PASSWORD_LENGTH } from "../constants.ts";
import type { Deps } from "../deps.ts";
import { passwordReset } from "../mail/templates.ts";
import { jsonError } from "../response.ts";
import * as resetStore from "../stores/passwordReset.ts";
import * as userStore from "../stores/user.ts";

export function passwordResetRoutes(deps: Deps) {
  const app = new Hono();

  app.post("/v1/auth/forgot-password", async (c) => {
    const body = await c.req.json<{ email?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const u = await userStore.getUserByEmail(deps.sql, body.email ?? "");
    if (!u) return c.body(null, 204);

    const raw = generateRefreshToken();
    const hash = hashRefreshToken(raw);
    const exp = new Date(Date.now() + deps.cfg.passwordResetTtlMs);
    try {
      await resetStore.createPasswordResetToken(deps.sql, u.id, hash, exp);
    } catch {
      return jsonError(c, 500, "failed to save token");
    }

    if (deps.mailer.configured() && deps.cfg.publicBaseUrl) {
      const resetURL = `${deps.cfg.publicBaseUrl}/reset?token=${raw}`;
      const { subject, body: text } = passwordReset(resetURL);
      await deps.mailer.send([u.email], subject, text).catch(() => {});
    }

    return c.body(null, 204);
  });

  app.post("/v1/auth/reset-password", async (c) => {
    const body = await c.req.json<{ token?: string; new_password?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    if (!body.token || (body.new_password?.length ?? 0) < MIN_PASSWORD_LENGTH) {
      return jsonError(c, 400, "invalid token or password");
    }

    const hash = hashRefreshToken(body.token);
    const rt = await resetStore.getValidPasswordResetByHash(deps.sql, hash);
    if (!rt) return jsonError(c, 401, "invalid or expired token");

    const u = await userStore.getUserById(deps.sql, rt.user_id);
    if (!u) return jsonError(c, 404, userStore.ErrUserNotFound);

    u.password_hash = await hashPassword(body.new_password!, deps.cfg.bcryptCost);
    u.force_password_change = false;
    try {
      await userStore.updateUser(deps.sql, u);
      await resetStore.markPasswordResetUsed(deps.sql, rt.id);
    } catch {
      return jsonError(c, 500, "failed to update password");
    }
    return c.body(null, 204);
  });

  return app;
}
