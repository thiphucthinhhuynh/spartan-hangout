interface IssueLike {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Turns Zod issues into `{ "fieldPath": "message" }`, keeping the first message per field.
 * Used by the API's validate() middleware and by web forms, so both report errors identically.
 * Nested paths are dotted: `availability.0.end`.
 */
export function issuesToFieldErrors(
  issues: readonly IssueLike[],
  fallbackKey = 'form',
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || fallbackKey;
    fields[key] ??= issue.message;
  }
  return fields;
}
