import type { ActivityMessageDto, MessageInput } from '@sh/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** Polling interval while a thread is open (architecture §12.4). Paused while the tab is hidden. */
const THREAD_POLL_MS = 5_000;

const chatPath = (id: string) => `/activities/${encodeURIComponent(id)}`;

/** Adds messages to a cached thread, skipping any it already has. */
export function appendMessages<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  added: T[],
) {
  queryClient.setQueryData<T[]>(queryKey, (current = []) => mergeMessages(current, added));
}

function mergeMessages<T extends { id: string }>(current: T[], added: T[]): T[] {
  const known = new Set(current.map((message) => message.id));
  return [...current, ...added.filter((message) => !known.has(message.id))];
}

/**
 * A chat or DM thread, oldest first. The first load fetches everything; each poll asks only for
 * messages after the last one (`?after=`) and appends them. Polls are background requests (Q27)
 * and stop once the server refuses access (left, removed, no longer connected).
 */
export function usePolledMessages<T extends { id: string }>(
  queryKey: readonly unknown[],
  path: string,
  { enabled = true } = {},
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey,
    queryFn: async () => {
      const current = queryClient.getQueryData<T[]>(queryKey);
      const last = current?.at(-1);
      if (!current || !last) return apiFetch<T[]>(path);
      const added = await apiFetch<T[]>(`${path}?after=${encodeURIComponent(last.id)}`, {
        background: true,
      });
      return mergeMessages(current, added);
    },
    refetchInterval: (query) => {
      const { error } = query.state;
      return error instanceof ApiError && error.status < 500 ? false : THREAD_POLL_MS;
    },
    enabled,
  });
}

/** FR35–FR36 */
export function useActivityMessages(id: string, options?: { enabled?: boolean }) {
  return usePolledMessages<ActivityMessageDto>(
    queryKeys.chat(id),
    `${chatPath(id)}/messages`,
    options,
  );
}

/** FR36: a chat message; FR38–FR39 with `asUpdate` (organizer only). */
export function useSendMessage(id: string, { asUpdate = false } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MessageInput) =>
      apiFetch<ActivityMessageDto>(`${chatPath(id)}/${asUpdate ? 'updates' : 'messages'}`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (message) => appendMessages(queryClient, queryKeys.chat(id), [message]),
  });
}
