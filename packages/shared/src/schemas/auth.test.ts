import { describe, expect, it } from 'vitest';
import { issuesToFieldErrors } from '../validation.js';
import { registerSchema } from './auth.js';

const valid = {
  email: 'Sammy.Spartan@SJSU.edu ',
  password: 'goSpartans1',
  displayName: '  Sammy  ',
  interests: ['STUDY', 'SPORTS'],
  availability: [{ dayOfWeek: 3, start: '16:00', end: '18:00' }],
};

function fieldErrors(input: unknown) {
  const result = registerSchema.safeParse(input);
  return result.success ? {} : issuesToFieldErrors(result.error.issues);
}

describe('registerSchema (FR01–FR02)', () => {
  it('accepts a valid registration and normalizes email and display name', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('sammy.spartan@sjsu.edu');
    expect(result.displayName).toBe('Sammy');
  });

  it('rejects non-SJSU email domains with a reason (FR01)', () => {
    expect(fieldErrors({ ...valid, email: 'sammy@gmail.com' }).email).toMatch(/@sjsu\.edu/);
    expect(fieldErrors({ ...valid, email: 'sammy@student.sjsu.edu.evil.com' }).email).toMatch(
      /@sjsu\.edu/,
    );
  });

  it('enforces the password rule (FR02)', () => {
    expect(fieldErrors({ ...valid, password: 'short1' }).password).toMatch(/8 characters/);
    expect(fieldErrors({ ...valid, password: 'onlyletters' }).password).toMatch(/number/);
    expect(fieldErrors({ ...valid, password: '12345678' }).password).toMatch(/letter/);
  });

  it('requires a display name of 1–50 characters (FR02)', () => {
    expect(fieldErrors({ ...valid, displayName: '   ' }).displayName).toBeDefined();
    expect(fieldErrors({ ...valid, displayName: 'x'.repeat(51) }).displayName).toBeDefined();
  });

  it('requires at least one known interest (FR02)', () => {
    expect(fieldErrors({ ...valid, interests: [] }).interests).toBeDefined();
    expect(fieldErrors({ ...valid, interests: ['HIKING'] })['interests.0']).toBeDefined();
  });

  it('requires at least one slot whose end is later than its start (FR02)', () => {
    expect(fieldErrors({ ...valid, availability: [] }).availability).toBeDefined();
    const sameTime = [{ dayOfWeek: 1, start: '10:00', end: '10:00' }];
    expect(fieldErrors({ ...valid, availability: sameTime })['availability.0.end']).toMatch(
      /later/,
    );
  });

  it('identifies every invalid field at once (FR02)', () => {
    const errors = fieldErrors({
      email: '',
      password: '',
      displayName: '',
      interests: [],
      availability: [],
    });
    expect(Object.keys(errors).sort()).toEqual([
      'availability',
      'displayName',
      'email',
      'interests',
      'password',
    ]);
  });
});
