import type { MeDto, OwnProfileDto, ProfileUpdateInput, PublicProfileDto } from '@sh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: () => apiFetch<OwnProfileDto>('/users/me'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      apiFetch<OwnProfileDto>('/users/me', { method: 'PATCH', body: input }),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.myProfile, profile);
      // The display name is shown elsewhere too (e.g. "Signed in as …").
      queryClient.setQueryData<MeDto | null>(queryKeys.me, (me) =>
        me ? { ...me, displayName: profile.displayName } : me,
      );
      // Shared-interest marks on other students' profiles depend on my interests.
      void queryClient.invalidateQueries({ queryKey: ['profile', 'student'] });
      // Recommended depends on my interests and availability (FR15).
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommended });
    },
  });
}

export function useStudentProfile(id: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.student(id),
    queryFn: () => apiFetch<PublicProfileDto>(`/users/${encodeURIComponent(id)}`),
    enabled,
  });
}
