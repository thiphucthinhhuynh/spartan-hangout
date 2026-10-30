import type { ActivityMessageDto, MessageInput } from '@sh/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** Polling interval while the chat is open (architecture §12.4). Paused while the tab is hidden. */
const CHAT_POLL_MS = 5_000;

const chatPath = (id: string) => `/activities/${encodeURIComponent(id)}`;

function appendMessages(queryClient: QueryClient, id: string, added: ActivityMessageDto[]) {
  queryClient.setQueryData<ActivityMessageDto[]>(queryKeys.chat(id), (current = []) => {
    const known = new Set(current.map((message) => message.id));
    return [...current, ...added.filter((message) => !known.has(message.id))];
  });
}

/**
 * FR35–FR36: oldest first. The first load fetches the whole chat; each poll asks only for messages
 * after the last one (`?after=`) and appends them. Polls are background requests (Q27).
 */
export function useActivityMessages(id: string, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.chat(id),
    queryFn: async () => {
      const current = queryClient.getQueryData<ActivityMessageDto[]>(queryKeys.chat(id));
      const last = current?.at(-1);
      if (!current || !last) return apiFetch<ActivityMessageDto[]>(`${chatPath(id)}/messages`);
      const added = await apiFetch<ActivityMessageDto[]>(
        `${chatPath(id)}/messages?after=${encodeURIComponent(last.id)}`,
        { background: true },
      );
      const known = new Set(current.map((message) => message.id));
      return [...current, ...added.filter((message) => !known.has(message.id))];
    },
    refetchInterval: CHAT_POLL_MS,
    enabled,
  });
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
    onSuccess: (message) => appendMessages(queryClient, id, [message]),
  });
}
