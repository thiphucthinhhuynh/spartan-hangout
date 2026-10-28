import { ErrorCode } from '@sh/shared';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { markSignedOut } from '../features/auth/api.js';
import { ApiError } from '../lib/apiClient.js';

function createQueryClient() {
  // FR10: when the server says the session is gone (logged out elsewhere, or 30 minutes idle),
  // drop the signed-in state so RequireAuth sends the student back to /login.
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.code === ErrorCode.UNAUTHENTICATED) {
      markSignedOut(queryClient);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        // Retrying a 4xx (not found, forbidden, validation) cannot succeed; retry network/5xx once.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      },
    },
  });
  return queryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
