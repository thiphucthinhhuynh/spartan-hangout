import type { ActivityCardDto, ActivitySearchCriteria, Paged } from '@sh/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** Only the criteria that are set, as URL search params. */
export function criteriaToParams(criteria: Partial<Record<string, string>>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria)) {
    if (value) params.set(key, String(value));
  }
  return params;
}

/** "Show more" paging over a list endpoint (docs/api.md: "Lists"). */
function usePagedActivities(
  queryKey: readonly unknown[],
  path: string,
  params: URLSearchParams,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey,
    enabled,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams(params);
      query.set('page', String(pageParam));
      return apiFetch<Paged<ActivityCardDto>>(`${path}?${query}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
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
