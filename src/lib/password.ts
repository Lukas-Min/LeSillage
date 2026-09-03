import bcrypt from "bcryptjs";

const COST = 12;
const MIN_LENGTH = 6;
const WEAK = new Set([
  "password10",
  "password123",
  "1234567890",
  "lesillage1",
  "qwerty1234",
]);

export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`;
  if (WEAK.has(password.toLowerCase())) return "Choose a stronger password";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain a letter";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
