import { issuesToFieldErrors } from '@sh/shared';
import type { z } from 'zod';

/** `{ "fieldPath": "message" }`, the same shape the API returns in VALIDATION_FAILED. */
export type FieldErrors = Record<string, string>;

type FormResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

/** Validates form values with a shared Zod schema (ADR-0007). */
export function validateForm<S extends z.ZodType>(
  schema: S,
  values: unknown,
): FormResult<z.infer<S>> {
  const result = schema.safeParse(values);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: issuesToFieldErrors(result.error.issues) };
}

/** Moves keyboard focus to the first invalid field after a failed submit. */
export function focusFirstInvalidField() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
