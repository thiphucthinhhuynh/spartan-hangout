import type {
  MessageResponse,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '@sh/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient.js';

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
