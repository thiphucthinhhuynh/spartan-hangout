import type { BlockInput, MessageResponse, ReportInput } from '@sh/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** FR50–FR52 */
export function useSubmitReport() {
  return useMutation({
    mutationFn: (input: ReportInput) =>
      apiFetch<MessageResponse>('/reports', { method: 'POST', body: input }),
  });
}

/** FR54–FR57: a block changes connections, activities, profiles and chats, so refresh them all. */
export function useBlockStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>('/blocks', {
        method: 'POST',
        body: { userId: studentId } satisfies BlockInput,
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.student(studentId) });
      queryClient.removeQueries({ queryKey: queryKeys.conversationThread(studentId) });
      for (const queryKey of [
        queryKeys.people,
        queryKeys.conversations,
        queryKeys.activities,
        queryKeys.allActivityDetails,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
