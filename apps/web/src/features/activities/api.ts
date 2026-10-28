import type { ActivityCreateInput, ActivityDetailDto, ActivityUpdateInput } from '@sh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

export function useActivity(id: string) {
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => apiFetch<ActivityDetailDto>(`/activities/${encodeURIComponent(id)}`),
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityCreateInput) =>
      apiFetch<ActivityDetailDto>('/activities', { method: 'POST', body: input }),
    onSuccess: (activity) => queryClient.setQueryData(queryKeys.activity(activity.id), activity),
  });
}

export function useUpdateActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityUpdateInput) =>
      apiFetch<ActivityDetailDto>(`/activities/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (activity) => queryClient.setQueryData(queryKeys.activity(id), activity),
  });
}
