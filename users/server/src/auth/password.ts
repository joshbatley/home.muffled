import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
