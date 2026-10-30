import type {
  ConnectionRequestDto,
  ConnectionRequestInput,
  Paged,
  StudentCardDto,
} from '@sh/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

function usePagedStudents(queryKey: readonly unknown[], path: string) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => apiFetch<Paged<StudentCardDto>>(`${path}?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/** FR43–FR44 */
export function useDiscoverStudents() {
  return usePagedStudents(queryKeys.discoverStudents, '/connections/discover');
}

/** FR13: the connection list. */
export function useConnections() {
  return usePagedStudents(queryKeys.connections, '/connections');
}

export function useConnectionRequests(direction: 'incoming' | 'outgoing') {
  return useQuery({
    queryKey: queryKeys.connectionRequests(direction),
    queryFn: () => apiFetch<ConnectionRequestDto[]>(`/connections/requests?direction=${direction}`),
  });
}

/** Any request change can affect discover, requests, connections, profiles and notifications. */
function useRequestMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.people });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'student'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

/** FR45 */
export function useSendConnectionRequest() {
  return useRequestMutation((input: ConnectionRequestInput) =>
    apiFetch<{ id: string }>('/connections/requests', { method: 'POST', body: input }),
  );
}

/** FR46 */
export function useAnswerConnectionRequest() {
  return useRequestMutation(({ id, accept }: { id: string; accept: boolean }) =>
    apiFetch<void>(
      `/connections/requests/${encodeURIComponent(id)}/${accept ? 'accept' : 'decline'}`,
      {
        method: 'POST',
      },
    ),
  );
}
