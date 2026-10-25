import { request } from './http'

export interface RecentUser {
  id: string
  username: string
  createdAt: string
  isActive: boolean
}

export interface DashboardData {
  users: {
    total: number
    active: number
    inactive: number
    deleted: number
    new_this_week: number
  }
  roles: { total: number }
  permissions: { total: number }
  recentUsers: RecentUser[]
}

export const dashboardApi = {
  get: (signal?: AbortSignal) => request<DashboardData>('/dashboard', { signal }),
}
