import { KeyRound, MoreHorizontal, Pencil, Power, Search, UserPlus, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/hooks'
import { ROL_LABEL } from '@/features/auth/roles'
import { normalizar } from '@/features/clientes/domain'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { formatDate, iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Rol, UsuarioAdmin } from '@/types/api'
import { RestablecerPasswordDialog } from './components/RestablecerPasswordDialog'
import { UsuarioFormDialog } from './components/UsuarioFormDialog'
import { useActualizarUsuario, useUsuarios } from './hooks'

type FiltroRol = 'TODOS' | Rol
const FILTROS: { value: FiltroRol; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERADOR', label: 'Operadores' },
  { value: 'REPARTIDOR', label: 'Repartidores' },
  { value: 'CLIENTE', label: 'Portal' },
]

function EstadoUsuario({ activo }: { activo: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', activo ? 'text-foreground' : 'text-muted-foreground')}>
      <span aria-hidden className={cn('size-1.5 rounded-full', activo ? 'bg-brand-green' : 'bg-muted-foreground/50')} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function Acciones({
  usuario,
  esUnoMismo,
  onEditar,
  onRestablecer,
  onAlternar,
}: {
  usuario: UsuarioAdmin
  esUnoMismo: boolean
  onEditar: () => void
  onRestablecer: () => void
  onAlternar: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${usuario.nombre}`} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onEditar}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRestablecer}>
          <KeyRound />
          Restablecer contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Un ADMIN no puede desactivarse a sí mismo (el servidor también lo impide). */}
        <DropdownMenuItem variant={usuario.activo ? 'destructive' : 'default'} disabled={esUnoMismo} onClick={onAlternar}>
          <Power />
          {usuario.activo ? 'Desactivar' : 'Activar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UsuariosPage() {
  const { usuario: yo } = useAuth()
  const { data: usuarios = [], isLoading, error } = useUsuarios()
  const actualizar = useActualizarUsuario()
  const esMovil = useEsMovil()
  const [filtro, setFiltro] = useState<FiltroRol>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)
  const [restablecer, setRestablecer] = useState<UsuarioAdmin | null>(null)
  const [aDesactivar, setADesactivar] = useState<UsuarioAdmin | null>(null)

  const q = normalizar(busqueda.trim())
  const visibles = usuarios
    .filter((u) => filtro === 'TODOS' || u.rol === filtro)
    .filter((u) => !q || normalizar(`${u.nombre} ${u.email} ${u.cliente ?? ''}`).includes(q))
    // Activos primero (figura), inactivos al final (fondo).
    .sort((a, b) => Number(b.activo) - Number(a.activo))
  const activos = usuarios.filter((u) => u.activo).length

  const abrir = (u: UsuarioAdmin | null) => {
    setEditando(u)
    setFormAbierto(true)
  }
  const cambiarActivo = async (u: UsuarioAdmin, activo: boolean) => {
    try {
      await actualizar.mutateAsync({ id: u.id, cambios: { activo } })
      toast.success(activo ? `${u.nombre} puede volver a entrar` : `${u.nombre} ya no puede iniciar sesión`)
      setADesactivar(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const alternar = (u: UsuarioAdmin) => (u.activo ? setADesactivar(u) : void cambiarActivo(u, true))
  const acciones = (u: UsuarioAdmin) => (
    <Acciones
      usuario={u}
      esUnoMismo={u.id === yo?.id}
      onEditar={() => abrir(u)}
      onRestablecer={() => setRestablecer(u)}
      onAlternar={() => alternar(u)}
    />
  )

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={usuarios.length ? `${activos} activos de ${usuarios.length}` : 'Quién entra al sistema y con qué rol'}
        actions={
          <Button onClick={() => abrir(null)}>
            <UserPlus />
            Nuevo usuario
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nombre, correo o empresa"
            aria-label="Buscar usuarios"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setBusqueda('')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Segmented label="Filtrar por rol" value={filtro} onChange={setFiltro} options={FILTROS} className="max-w-full overflow-x-auto" />
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-24 text-center">
          <UsersRound className="mb-2 size-6 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay usuarios</p>
          <p className="text-sm text-muted-foreground">{usuarios.length ? 'Prueba con otro filtro.' : 'Crea el primero con «Nuevo usuario».'}</p>
        </div>
      ) : esMovil ? (
        <ul className="-mx-4 divide-y border-y" aria-label="Lista de usuarios">
          {visibles.map((u) => (
            <li key={u.id} className={cn('flex items-center gap-3 px-4 py-3', !u.activo && 'opacity-60')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {iniciales(u.nombre)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{u.nombre}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {ROL_LABEL[u.rol]}
                  {u.cliente && ` · ${u.cliente}`}
                </span>
                <span className="mt-1 block">
                  <EstadoUsuario activo={u.activo} />
                </span>
              </span>
              {acciones(u)}
            </li>
          ))}
        </ul>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-normal text-muted-foreground">Usuario</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">Rol</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">Estado</TableHead>
              <TableHead className="hidden text-right text-xs font-normal text-muted-foreground lg:table-cell">Alta</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((u) => (
              <TableRow key={u.id} className={cn(!u.activo && 'text-muted-foreground')}>
                <TableCell className="py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      {iniciales(u.nombre)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {u.nombre}
                        {u.id === yo?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="block">{ROL_LABEL[u.rol]}</span>
                  {u.cliente && <span className="block max-w-48 truncate text-xs text-muted-foreground">{u.cliente}</span>}
                </TableCell>
                <TableCell className="py-3">
                  <EstadoUsuario activo={u.activo} />
                </TableCell>
                <TableCell className="hidden py-3 text-right text-muted-foreground tabular-nums lg:table-cell">{formatDate(u.creadoEn)}</TableCell>
                <TableCell className="py-3 text-right">{acciones(u)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <UsuarioFormDialog open={formAbierto} onOpenChange={setFormAbierto} usuario={editando} />
      <RestablecerPasswordDialog usuario={restablecer} onClose={() => setRestablecer(null)} />
      <Confirmar
        abierto={!!aDesactivar}
        onCancelar={() => setADesactivar(null)}
        onConfirmar={() => aDesactivar && void cambiarActivo(aDesactivar, false)}
        titulo={`¿Desactivar a ${aDesactivar?.nombre}?`}
        descripcion="No podrá iniciar sesión y su sesión abierta se cerrará en su siguiente acción. Su historial se conserva y puedes reactivarlo cuando quieras."
        accion="Desactivar"
        pendiente={actualizar.isPending}
      />
    </>
  )
}
