import type { NotificationDto, Paged, UnreadCountDto } from '@sh/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

/** Polling interval for the bell's badge (architecture §12.4). Paused while the tab is hidden. */
const UNREAD_POLL_MS = 30_000;

/** FR42: the bell's badge. Polled in the background so it doesn't keep the session alive (Q27). */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => apiFetch<UnreadCountDto>('/notifications/unread-count', { background: true }),
    refetchInterval: UNREAD_POLL_MS,
  });
}

/** FR42: newest first, with "Show more". */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notificationList,
    queryFn: ({ pageParam }) =>
      apiFetch<Paged<NotificationDto>>(`/notifications?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/** FR42: opening a notification marks it read. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
