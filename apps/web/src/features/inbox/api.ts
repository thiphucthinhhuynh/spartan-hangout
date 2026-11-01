import type { ConversationSummaryDto, DirectMessageDto, MessageInput } from '@sh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { appendMessages, usePolledMessages } from '../chat/api.js';

const threadPath = (userId: string) => `/conversations/${encodeURIComponent(userId)}/messages`;

/** FR49: most recent first. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => apiFetch<ConversationSummaryDto[]>('/conversations'),
  });
}

/** FR47–FR48: polled while the conversation is open. */
export function useConversationThread(userId: string, options?: { enabled?: boolean }) {
  return usePolledMessages<DirectMessageDto>(
    queryKeys.conversationThread(userId),
    threadPath(userId),
    options,
  );
}

/** FR47, FR49 */
export function useSendDirectMessage(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MessageInput) =>
      apiFetch<DirectMessageDto>(threadPath(userId), { method: 'POST', body: input }),
    onSuccess: (message) => {
      appendMessages(queryClient, queryKeys.conversationThread(userId), [message]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
