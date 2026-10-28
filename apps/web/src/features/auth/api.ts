import type {
  LoginInput,
  MeDto,
  MessageResponse,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '@sh/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/apiClient.js';
import { queryKeys } from '../../lib/queryKeys.js';

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch<MessageResponse>('/auth/register', { method: 'POST', body: input }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (input: VerifyEmailInput) =>
      apiFetch<MessageResponse>('/auth/verify-email', { method: 'POST', body: input }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (input: ResendVerificationInput) =>
      apiFetch<MessageResponse>('/auth/resend-verification', { method: 'POST', body: input }),
  });
}

async function fetchMe(): Promise<MeDto | null> {
  try {
    return await apiFetch<MeDto>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** The logged-in student (`null` when signed out). Auth state is just this query (ADR-0008). */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: fetchMe, staleTime: 60_000 });
}

/** For screens behind RequireAuth, where a signed-in student is guaranteed. */
export function useCurrentUser(): MeDto {
  const { data } = useMe();
  if (!data) throw new Error('useCurrentUser() used outside RequireAuth');
  return data;
}

/** Forgets everything cached for the previous student; RequireAuth then sends them to /login. */
export function markSignedOut(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
  queryClient.setQueryData(queryKeys.me, null);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<MeDto>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (me) => queryClient.setQueryData(queryKeys.me, me),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    // Signed out locally even if the request fails (e.g. the session had already expired).
    onSettled: () => markSignedOut(queryClient),
  });
}
