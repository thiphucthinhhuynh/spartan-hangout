import type {
  ActivityCardDto,
  ActivityCreateInput,
  ActivityDetailDto,
  ActivityUpdateInput,
  MyActivitiesInput,
  Paged,
  ParticipantDto,
} from '@sh/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

const activityPath = (id: string) => `/activities/${encodeURIComponent(id)}`;

/** "Show more" paging over an activity list endpoint (docs/api.md: "Lists"). */
export function usePagedActivities(
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

/**
 * After a change to one activity: store its new detail, refresh its participants (same key prefix)
 * and every activity list (spots, Recommended, My plans).
 */
function activityChanged(queryClient: QueryClient, activity: ActivityDetailDto) {
  queryClient.setQueryData(queryKeys.activity(activity.id), activity);
  void queryClient.invalidateQueries({ queryKey: queryKeys.participants(activity.id) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.activities });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => apiFetch<ActivityDetailDto>(activityPath(id)),
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityCreateInput) =>
      apiFetch<ActivityDetailDto>('/activities', { method: 'POST', body: input }),
    onSuccess: (activity) => activityChanged(queryClient, activity),
  });
}

export function useUpdateActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityUpdateInput) =>
      apiFetch<ActivityDetailDto>(activityPath(id), { method: 'PATCH', body: input }),
    onSuccess: (activity) => activityChanged(queryClient, activity),
  });
}

/** FR19 */
export function useParticipants(id: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.participants(id),
    queryFn: () => apiFetch<ParticipantDto[]>(`${activityPath(id)}/participants`),
    enabled,
  });
}

/** FR21–FR23. A failure is an ApiError whose `code` says which condition failed. */
export function useJoinActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<ActivityDetailDto>(`${activityPath(id)}/join`, { method: 'POST' }),
    onSuccess: (activity) => activityChanged(queryClient, activity),
    // A failed join often means the activity changed (e.g. someone took the last spot).
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.activity(id) }),
  });
}

/** FR31–FR32 (organizer only). Can't be undone. */
export function useCancelActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiFetch<ActivityDetailDto>(`${activityPath(id)}/cancel`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (activity) => activityChanged(queryClient, activity),
  });
}

/** FR24–FR25 */
export function useLeaveActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<ActivityDetailDto>(`${activityPath(id)}/leave`, { method: 'POST' }),
    onSuccess: (activity) => activityChanged(queryClient, activity),
  });
}

/** FR33–FR34 (organizer only). */
export function useRemoveParticipant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiFetch<void>(`${activityPath(id)}/participants/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        body: { reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    },
  });
}

/** "My plans" (FR18 entry point). */
export function useMyActivities({ role, when }: Pick<MyActivitiesInput, 'role' | 'when'>) {
  return usePagedActivities(
    queryKeys.myActivities(role, when),
    '/activities/mine',
    new URLSearchParams({ role, when }),
  );
}
