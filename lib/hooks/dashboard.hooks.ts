import { useQuery, queryOptions } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard.api'
import { dashboardKeys } from '@/lib/constants/query-keys'

export const dashboardQueries = {
  summary: () =>
    queryOptions({
      queryKey: dashboardKeys.all,
      queryFn: ({ signal }) => dashboardApi.get(signal),
    }),
}

export function useDashboard({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...dashboardQueries.summary(), enabled })
}
