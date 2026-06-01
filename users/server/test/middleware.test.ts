import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { Claims } from "../src/auth/token.ts";
import { PERM_USERS_ADMIN } from "../src/constants.ts";
import {
  adminMiddleware,
  forcePasswordChangeMiddleware,
  type AppVariables,
} from "../src/middleware/auth.ts";

function withClaims(claims: Claims) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (c, next) => {
    c.set("claims", claims);
    c.set("jwtSecret", "x");
    await next();
  });
  return app;
}

describe("admin middleware", () => {
  test("allows admin role", async () => {
    const app = withClaims({
      user_id: "u",
      email: "a@b.c",
      roles: ["admin"],
      permissions: [],
      force_password_change: false,
    });
    app.use("*", adminMiddleware());
    let called = false;
    app.get("/", (c) => {
      called = true;
      return c.text("ok");
    });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(called).toBe(true);
  });

  test("allows users:admin permission", async () => {
    const app = withClaims({
      user_id: "u",
      email: "a@b.c",
      roles: [],
      permissions: [PERM_USERS_ADMIN],
      force_password_change: false,
    });
    app.use("*", adminMiddleware());
    app.get("/", (c) => c.text("ok"));
    expect((await app.request("/")).status).toBe(200);
  });

  test("forbidden for regular user", async () => {
    const app = withClaims({
      user_id: "u",
      email: "a@b.c",
      roles: ["user"],
      permissions: [],
      force_password_change: false,
    });
    app.use("*", adminMiddleware());
    app.get("/", (c) => c.text("ok"));
    expect((await app.request("/")).status).toBe(403);
  });
});

describe("force password change", () => {
  test("allows own password change", async () => {
    const app = withClaims({
      user_id: "u1",
      email: "a@b.c",
      roles: [],
      permissions: [],
      force_password_change: true,
    });
    app.use("*", forcePasswordChangeMiddleware());
    app.put("/v1/users/:id/password", (c) => c.text("ok"));
    expect((await app.request("/v1/users/u1/password", { method: "PUT" })).status).toBe(200);
  });

  test("blocks other routes", async () => {
    const app = withClaims({
      user_id: "u1",
      email: "a@b.c",
      roles: [],
      permissions: [],
      force_password_change: true,
    });
    app.use("*", forcePasswordChangeMiddleware());
    app.get("/v1/me", (c) => c.text("ok"));
    expect((await app.request("/v1/me")).status).toBe(403);
  });
});
