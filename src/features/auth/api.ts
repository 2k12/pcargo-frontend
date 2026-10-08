import { api } from '@/lib/api'
import type { LoginResponse, Usuario } from '@/types/api'

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<Usuario>('/auth/me'),
}
