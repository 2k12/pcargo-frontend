import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ApiError } from '@/lib/api'
import { CLAVE_TEMA } from '@/lib/tema'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // No reintentar errores del cliente (4xx): solo fallos de red/servidor.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  })
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider storageKey={CLAVE_TEMA} attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Toaster vive en AppShell: todos los avisos son del panel y así la landing no descarga sonner. */}
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
