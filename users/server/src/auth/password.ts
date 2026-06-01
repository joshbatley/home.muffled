import bcrypt from "bcryptjs";

const DUMMY_PASSWORD = "invalid-password-placeholder";
let dummyHash: string | null = null;

export async function hashPassword(password: string, cost: number): Promise<string> {
  return bcrypt.hash(password, cost);
}

export async function comparePassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function comparePasswordDummy(password: string, cost: number): Promise<void> {
  if (!dummyHash) dummyHash = bcrypt.hashSync(DUMMY_PASSWORD, cost);
  await bcrypt.compare(password, dummyHash);
}
