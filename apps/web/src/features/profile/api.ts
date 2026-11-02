import type {
  DeleteAccountInput,
  MeDto,
  OwnProfileDto,
  ProfileUpdateInput,
  PublicProfileDto,
} from '@sh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { markSignedOut } from '../auth/api.js';

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

/** FR07–FR08: the session ends with the account, so everything cached for it is forgotten. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteAccountInput) =>
      apiFetch<void>('/users/me', { method: 'DELETE', body: input }),
    onSuccess: () => markSignedOut(queryClient),
  });
}

export function useStudentProfile(id: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.student(id),
    queryFn: () => apiFetch<PublicProfileDto>(`/users/${encodeURIComponent(id)}`),
    enabled,
  });
}
