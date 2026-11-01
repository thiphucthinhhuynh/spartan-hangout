import type { MessageResponse, ReportInput } from '@sh/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';

/** FR50–FR52 */
export function useSubmitReport() {
  return useMutation({
    mutationFn: (input: ReportInput) =>
      apiFetch<MessageResponse>('/reports', { method: 'POST', body: input }),
  });
}
