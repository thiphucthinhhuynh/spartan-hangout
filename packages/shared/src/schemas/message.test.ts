import { describe, expect, it } from 'vitest';
import { messageListSchema, messageSchema } from './message.js';

describe('messageSchema (FR36, FR38)', () => {
  it('trims, and rejects empty or whitespace-only text (Q18)', () => {
    expect(messageSchema.parse({ body: '  See you there!  ' })).toEqual({ body: 'See you there!' });
    expect(messageSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(messageSchema.safeParse({}).success).toBe(false);
  });

  it('allows up to 500 characters', () => {
    expect(messageSchema.safeParse({ body: 'a'.repeat(500) }).success).toBe(true);
    expect(messageSchema.safeParse({ body: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('messageListSchema', () => {
  it('accepts no cursor or a message id', () => {
    expect(messageListSchema.parse({})).toEqual({});
    expect(messageListSchema.parse({ after: '' })).toEqual({});
    expect(messageListSchema.safeParse({ after: 'nope' }).success).toBe(false);
  });
});
