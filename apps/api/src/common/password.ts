import argon2 from 'argon2';

// argon2id with the library defaults (64 MiB memory, 3 iterations, parallelism 4) — open question Q26.

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Spends the same time as a real password check. Used when the email has no account, so response
 * timing does not reveal which emails are registered (FR09).
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('spartan-hangout-timing-dummy');
  await verifyPassword(await dummyHash, password);
}
