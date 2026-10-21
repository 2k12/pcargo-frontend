import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff, Loader2, PackageSearch } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { LogoMark } from '@/components/brand/PCargoLogo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnlacesLegales } from '@/features/legal/components/EnlacesLegales'
import { errorMessage } from '@/lib/api'
import { DETALLE_VERSION, VERSION_APP } from '@/lib/version'
import type { Usuario } from '@/types/api'
import { useAuth } from './hooks'
import { destinoTrasLogin, espacioDeRol } from './roles'

const schema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormValues = z.infer<typeof schema>

const codigoSchema = z.object({
  codigo: z.string().min(1, 'Ingresa tu código'),
})

type CodigoValues = z.infer<typeof codigoSchema>

type Metodo = 'credenciales' | 'codigo'

/** Última pestaña usada: quien entra con código la ve por defecto la próxima vez. */
const CLAVE_METODO_LOGIN = 'pcargo.login.metodo'

function leerMetodo(): Metodo {
  try {
    return localStorage.getItem(CLAVE_METODO_LOGIN) === 'codigo' ? 'codigo' : 'credenciales'
  } catch {
    return 'credenciales'
  }
}

function guardarMetodo(metodo: Metodo) {
  try {
    localStorage.setItem(CLAVE_METODO_LOGIN, metodo)
  } catch {
    // Almacenamiento no disponible (p. ej. modo privado): solo se pierde la preferencia.
  }
}

/** Campo secreto (contraseña o código) con el botón para mostrar u ocultar lo escrito. */
function CampoSecreto({
  id,
  nombre,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'id'> & { id: string; nombre: string }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={ver ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        aria-label={ver ? `Ocultar ${nombre}` : `Mostrar ${nombre}`}
        aria-pressed={ver}
        aria-controls={id}
        onClick={() => setVer((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function ErrorLogin({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  )
}

/** Cada rol va a su espacio (contrato v12); la ruta pedida solo se respeta si el rol puede verla. */
function useRedirigirTrasLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  return (u: Usuario) => {
    const from = (location.state as { from?: string } | null)?.from
    navigate(destinoTrasLogin(u.rol, from), { replace: true })
  }
}

function FormCredenciales() {
  const { login } = useAuth()
  const redirigir = useRedirigirTrasLogin()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      redirigir(await login(values.email, values.password))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Ingresar con correo y contraseña">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="tu@pcargo.ec" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <CampoSecreto id="password" nombre="contraseña" autoComplete="current-password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <ErrorLogin error={error} />
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Ingresar
      </Button>
    </form>
  )
}

function FormCodigo() {
  const { loginConCodigo } = useAuth()
  const redirigir = useRedirigirTrasLogin()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodigoValues>({ resolver: zodResolver(codigoSchema), defaultValues: { codigo: '' } })

  const onSubmit = async ({ codigo }: CodigoValues) => {
    setError(null)
    try {
      redirigir(await loginConCodigo(codigo))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Ingresar con código único">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código de acceso</Label>
        <CampoSecreto
          id="codigo"
          nombre="código"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          aria-invalid={!!errors.codigo}
          aria-describedby={errors.codigo ? 'codigo-error' : 'codigo-ayuda'}
          {...register('codigo')}
        />
        {errors.codigo ? (
          <p id="codigo-error" className="text-xs text-destructive">
            {errors.codigo.message}
          </p>
        ) : (
          <p id="codigo-ayuda" className="text-xs text-muted-foreground">
            El código que activaste en tu perfil. Distingue mayúsculas.
          </p>
        )}
      </div>
      <ErrorLogin error={error} />
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        Ingresar
      </Button>
    </form>
  )
}

export function LoginPage() {
  const { status, usuario } = useAuth()
  const [metodo, setMetodo] = useState<Metodo>(leerMetodo)

  if (status === 'authenticated' && usuario) return <Navigate to={espacioDeRol(usuario.rol)} replace />

  const cambiarMetodo = (valor: unknown) => {
    const m: Metodo = valor === 'codigo' ? 'codigo' : 'credenciales'
    setMetodo(m)
    guardarMetodo(m)
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
              <Tabs value={metodo} onValueChange={cambiarMetodo} className="gap-4">
                <TabsList className="w-full" aria-label="Forma de ingresar">
                  <TabsTrigger value="credenciales">Credenciales</TabsTrigger>
                  <TabsTrigger value="codigo">Código único</TabsTrigger>
                </TabsList>
                <TabsContent value="credenciales">
                  <FormCredenciales />
                </TabsContent>
                <TabsContent value="codigo">
                  <FormCodigo />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full" nativeButton={false} render={<Link to="/seguimiento" />}>
            <PackageSearch />
            Rastrear un envío
          </Button>
        </div>
      </main>

      {/* Pie discreto, fuera del formulario: solo las políticas que aplican al personal y la versión de la app. */}
      <footer className="flex flex-col items-center gap-1.5 px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground">
        <EnlacesLegales rutas={['/privacidad', '/terminos', '/cookies']} />
        <p className="text-[11px] text-muted-foreground/70 tabular-nums" title={DETALLE_VERSION}>
          {VERSION_APP}
        </p>
      </footer>
    </div>
  )
}
