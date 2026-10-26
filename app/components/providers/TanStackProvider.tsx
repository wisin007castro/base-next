'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api/http'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Evita refetch en cada montaje / cambio de foco si el dato es reciente
        staleTime: 30 * 1000,
        // 4xx (401, 403, 404, 422…) no se arreglan reintentando
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const TanStackProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
