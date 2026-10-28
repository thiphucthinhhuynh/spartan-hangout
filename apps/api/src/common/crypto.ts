import { createHash, randomBytes } from 'node:crypto';

/** A random, URL-safe secret (32 bytes) for emailed links and session cookies. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored only as their SHA-256 hash, so a database leak does not leak usable links. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
