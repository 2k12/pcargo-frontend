import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resumen } from '@/types/api'

export const dashboardApi = {
  resumen: () => api.get<Resumen>('/dashboard/resumen'),
}

export function useResumen() {
  return useQuery({ queryKey: ['dashboard', 'resumen'], queryFn: dashboardApi.resumen })
}
