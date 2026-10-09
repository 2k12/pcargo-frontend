import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff, Loader2, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { LogoMark } from '@/components/brand/PCargoLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnlacesLegales } from '@/features/legal/components/EnlacesLegales'
import { errorMessage } from '@/lib/api'
import { useAuth } from './hooks'

const schema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [verPassword, setVerPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  if (status === 'authenticated') return <Navigate to="/panel" replace />

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await login(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from ?? '/panel'
      navigate(from, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-muted/30">
      <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/" />}>
          <ArrowLeft />
          Volver al inicio
        </Button>
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pt-20 pb-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link to="/" aria-label="Ir al inicio">
              <LogoMark className="size-14" />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-brand-blue-text">PCargo</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Iniciar sesión</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="tu@pcargo.ec" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={verPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="pr-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={verPassword}
                      aria-controls="password"
                      onClick={() => setVerPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                {error && (
                  <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Ingresar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Solo en desarrollo: publicar credenciales en producción expondría los datos personales de los clientes. */}
          {import.meta.env.DEV && (
            <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Credenciales de demostración (solo en desarrollo)</p>
              <p>admin@pcargo.ec · Admin123!</p>
              <p>operador@pcargo.ec · Operador123!</p>
            </div>
          )}

          <Button variant="ghost" className="w-full" nativeButton={false} render={<Link to="/seguimiento" />}>
            <PackageSearch />
            Rastrear un envío
          </Button>
        </div>
      </main>

      {/* Pie discreto, fuera del formulario: solo las políticas que aplican al personal. */}
      <footer className="flex justify-center px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground">
        <EnlacesLegales rutas={['/privacidad', '/terminos', '/cookies']} />
      </footer>
    </div>
  )
}
