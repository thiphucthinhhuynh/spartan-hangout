import argon2 from 'argon2';

// argon2id with the library defaults (64 MiB memory, 3 iterations, parallelism 4) — open question Q26.

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
