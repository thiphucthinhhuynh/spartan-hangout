import type { ActivitySearchCriteria } from '@sh/shared';
import { queryKeys } from '../../lib/queryKeys.js';
import { usePagedActivities } from '../activities/api.js';

/** Only the criteria that are set, as URL search params. */
export function criteriaToParams(criteria: Partial<Record<string, string>>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria)) {
    if (value) params.set(key, String(value));
  }
  return params;
}

/** FR14–FR15. Profile edits invalidate it, so they show up on the next load. */
export function useRecommended() {
  return usePagedActivities(
    queryKeys.recommended,
    '/activities/recommended',
    new URLSearchParams(),
  );
}

/** FR16–FR17. Pass `enabled: false` while the criteria are invalid. */
export function useActivitySearch(criteria: ActivitySearchCriteria, enabled: boolean) {
  return usePagedActivities(
    queryKeys.activitySearch(criteria),
    '/activities',
    criteriaToParams(criteria),
    enabled,
  );
}
