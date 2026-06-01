import { describe, expect, test } from "bun:test";
import { comparePassword, hashPassword } from "../src/auth/password.ts";
import { hashRefreshToken } from "../src/auth/refresh.ts";
import { issueAccessToken, validateAccessToken } from "../src/auth/token.ts";

describe("password", () => {
  test("hash and compare", async () => {
    const h = await hashPassword("secret123", 12);
    expect(await comparePassword(h, "secret123")).toBe(true);
    expect(await comparePassword(h, "wrong")).toBe(false);
  });
});

describe("token", () => {
  const secret = "test-secret-key-32bytes-long!!";

  test("issue and validate", async () => {
    const tok = await issueAccessToken(secret, "uid-1", "a@b.c", ["user"], ["intranet:read"], false, 3600000);
    const claims = await validateAccessToken(secret, tok);
    expect(claims?.user_id).toBe("uid-1");
    expect(claims?.email).toBe("a@b.c");
    expect(claims?.permissions).toEqual(["intranet:read"]);
  });

  test("wrong secret", async () => {
    const tok = await issueAccessToken(secret, "u", "e@e.e", [], [], false, 3600000);
    const claims = await validateAccessToken("other-secret-key-32bytes-long!", tok);
    expect(claims).toBeNull();
  });
});

describe("refresh hash", () => {
  test("deterministic hex", () => {
    const h1 = hashRefreshToken("abc");
    const h2 = hashRefreshToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });
});
