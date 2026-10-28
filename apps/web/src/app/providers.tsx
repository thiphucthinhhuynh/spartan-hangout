import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../lib/apiClient.js';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying a 4xx (not found, forbidden, validation) cannot succeed; retry network/5xx once.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
