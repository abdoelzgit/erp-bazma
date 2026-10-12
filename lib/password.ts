import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash plain text password menggunakan bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifikasi plain text password dengan hashed password menggunakan bcryptjs
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
