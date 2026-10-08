import { ArrowUpDown, BarChart3, MapPin, MoreHorizontal, Package, Pencil, Phone, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { FiltrosMovil, OpcionesFiltro } from '@/components/FiltrosMovil'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { NuevoEnvioDialog } from '@/features/envios/components/NuevoEnvioDialog'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatIngreso, formatRelativo, iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Cliente } from '@/types/api'
import { useClientes, useEliminarCliente } from './api'
import { ClienteFormDialog } from './components/ClienteFormDialog'
import { buscarClientes, ordenarClientes, type OrdenClientes } from './domain'

const ORDEN_INICIAL: OrdenClientes = 'nombre'
const OPCIONES_ORDEN: { value: OrdenClientes; label: string }[] = [
  { value: 'nombre', label: 'A–Z' },
  { value: 'envios', label: 'Más envíos' },
  { value: 'monto', label: 'Más ingresos' },
  { value: 'reciente', label: 'Recientes' },
]

function ClienteCard({
  cliente,
  onEditar,
  onEliminar,
}: {
  cliente: Cliente
  onEditar: () => void
  onEliminar: () => void
}) {
  return (
    <li className={cn('flex flex-col gap-3 p-4', SUPERFICIE)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {iniciales(cliente.nombre)}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate font-medium">{cliente.nombre}</p>
          <a href={`tel:${cliente.telefono.replace(/\s/g, '')}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Phone className="size-3" />
            {cliente.telefono}
          </a>
          {cliente.direccion && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{cliente.direccion}</span>
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${cliente.nombre}`} />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditar}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to={`/panel?cliente=${cliente.id}`} />}>
              <BarChart3 />
              Ver en el resumen
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to={`/envios?clienteId=${cliente.id}`} />}>
              <Package />
              Ver sus envíos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onEliminar}>
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {cliente.notas && <p className="line-clamp-2 text-xs text-muted-foreground italic">{cliente.notas}</p>}

      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Envíos</dt>
          <dd className="text-sm font-semibold tabular-nums">{cliente.envios}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ingresos</dt>
          <dd className={cn('text-sm font-semibold tabular-nums', cliente.monto > 0 && 'text-brand-green-text')}>
            {formatIngreso(cliente.monto)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Último</dt>
          <dd className="truncate text-sm">{cliente.ultimoEnvio ? formatRelativo(cliente.ultimoEnvio) : '—'}</dd>
        </div>
      </dl>

      <NuevoEnvioDialog cliente={cliente} label="Nuevo envío" variant="outline" />
    </li>
  )
}

export function ClientesPage() {
  const { data: clientes = [], isLoading, error } = useClientes()
  const eliminar = useEliminarCliente()
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenClientes>(ORDEN_INICIAL)
  const esMovil = useEsMovil()
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [aEliminar, setAEliminar] = useState<Cliente | null>(null)

  const visibles = ordenarClientes(buscarClientes(clientes, busqueda), orden)
  const abrirNuevo = () => {
    setEditando(null)
    setFormAbierto(true)
  }

  const confirmarEliminar = async () => {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar.id)
      toast.success(`${aEliminar.nombre} fue eliminado; sus envíos se conservan`)
      setAEliminar(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description={
          clientes.length > 0
            ? `${clientes.length} ${clientes.length === 1 ? 'cliente frecuente' : 'clientes frecuentes'}`
            : 'Quienes envían seguido: elígelos al registrar un envío'
        }
        actions={
          <Button onClick={abrirNuevo}>
            <UserPlus />
            Nuevo cliente
          </Button>
        }
      />

      {/* Móvil: buscador + botón «Ordenar» (hoja inferior) en una sola fila. */}
      <div className={esMovil ? 'flex gap-2' : 'flex flex-col gap-2 sm:flex-row sm:items-center'}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar clientes"
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
        {esMovil ? (
          <FiltrosMovil
            activos={orden === ORDEN_INICIAL ? 0 : 1}
            onLimpiar={() => setOrden(ORDEN_INICIAL)}
            etiqueta="Ordenar"
            icono={ArrowUpDown}
            titulo="Ordenar clientes"
          >
            <OpcionesFiltro label="Ordenar por" value={orden} onChange={setOrden} options={OPCIONES_ORDEN} columnas={1} />
          </FiltrosMovil>
        ) : (
          <Segmented label="Ordenar por" value={orden} onChange={setOrden} options={OPCIONES_ORDEN} />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}

      {isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </ul>
      ) : clientes.length === 0 ? (
        <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', SUPERFICIE)}>
          <Users className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Aún no hay clientes registrados</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Registra a quienes envían seguido. También puedes guardarlos desde «Nuevo envío» con un solo interruptor.
            </p>
          </div>
          <Button onClick={abrirNuevo}>
            <UserPlus />
            Registrar el primero
          </Button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="space-y-3 py-10 text-center text-sm text-muted-foreground">
          <p>Ningún cliente coincide con «{busqueda}».</p>
          <Button variant="outline" onClick={abrirNuevo}>
            <UserPlus />
            Registrarlo como nuevo
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              onEditar={() => {
                setEditando(c)
                setFormAbierto(true)
              }}
              onEliminar={() => setAEliminar(c)}
            />
          ))}
        </ul>
      )}

      <ClienteFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        cliente={editando}
        inicial={!editando && busqueda.trim() ? (/\d{3}/.test(busqueda) ? { telefono: busqueda } : { nombre: busqueda }) : undefined}
      />

      <Dialog open={!!aEliminar} onOpenChange={(o) => !o && setAEliminar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar a {aEliminar?.nombre}?</DialogTitle>
            <DialogDescription>
              Sus {aEliminar?.envios ?? 0} envíos se conservan, pero dejarán de contar en su historial de cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminar.isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
