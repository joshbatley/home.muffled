import { SignJWT, jwtVerify } from "jose";

export type Claims = {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
  exp?: number;
};

export async function issueAccessToken(
  secret: string,
  userId: string,
  email: string,
  roles: string[],
  permissions: string[],
  forcePasswordChange: boolean,
  ttlMs: number,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    user_id: userId,
    email,
    roles,
    permissions,
    force_password_change: forcePasswordChange,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ttlMs) / 1000))
    .sign(key);
}

export async function validateAccessToken(
  secret: string,
  token: string,
): Promise<Claims | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return {
      user_id: String(payload.user_id ?? ""),
      email: String(payload.email ?? ""),
      roles: (payload.roles as string[]) ?? [],
      permissions: (payload.permissions as string[]) ?? [],
      force_password_change: Boolean(payload.force_password_change),
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}
