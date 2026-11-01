import type { Paged, ReportDto, ReportStatus } from '@sh/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** FR53: every report, newest first, optionally by status. */
export function useReports(status: ReportStatus | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminReports(status),
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ page: String(pageParam) });
      if (status) query.set('status', status);
      return apiFetch<Paged<ReportDto>>(`/admin/reports?${query}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/** FR53 */
export function useMarkReviewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReportDto>(`/admin/reports/${encodeURIComponent(id)}/review`, { method: 'POST' }),
    // Also after a failure: "already reviewed" means another administrator got there first.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.allAdminReports }),
  });
}
