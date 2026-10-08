import { ArrowRight, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEsAdmin } from '@/features/auth/hooks'
import { TIPOS_CARGA_DEFAULT } from '@/features/envios/domain'
import { TIPO_CARGA_ICON } from '@/features/envios/ui'
import { useTiposCarga } from '@/features/envios/hooks'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDuracion } from '@/lib/format'
import type { Ruta } from '@/types/api'
import { CiudadesCobertura } from './components/CiudadesCobertura'
import { EditarRutaDialog } from './components/EditarRutaDialog'
import { NuevaRutaDialog } from './components/NuevaRutaDialog'
import { useActualizarRuta, useRutas } from './hooks'

export function RutasPage() {
  const esAdmin = useEsAdmin()
  const { data: rutas, isLoading, error } = useRutas()
  const { data: tipos = TIPOS_CARGA_DEFAULT } = useTiposCarga()
  const actualizar = useActualizarRuta()
  const [editando, setEditando] = useState<Ruta | null>(null)

  const ordenadas = [...(rutas ?? [])].sort(
    (a, b) => a.origen.nombre.localeCompare(b.origen.nombre) || a.tarifaBase - b.tarifaBase,
  )

  const toggleActiva = (ruta: Ruta, activa: boolean) =>
    actualizar.mutate(
      { id: ruta.id, cambios: { activa } },
      {
        onSuccess: () => toast.success(activa ? 'Ruta activada' : 'Ruta desactivada'),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <>
      <PageHeader
        title="Cobertura y tarifas"
        description="Ciudades donde operamos, trayectos y tarifas base"
        actions={esAdmin ? <NuevaRutaDialog /> : undefined}
      />

      <CiudadesCobertura rutas={rutas ?? []} esAdmin={esAdmin} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tipos.map((t) => {
          const Icon = TIPO_CARGA_ICON[t.codigo]
          return (
            <Card key={t.codigo} size="sm" className="flex-row items-center gap-3 px-4">
              <div className="rounded-lg bg-muted p-2">
                <Icon className="size-4" />
              </div>
              <div className="text-sm">
                <p className="font-medium">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  ×{t.factor} · incluye {t.pesoIncluidoKg} kg · máx {t.pesoMaxKg} kg
                </p>
              </div>
            </Card>
          )
        })}
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        Costo = tarifa base × factor del tipo + $0,50 por cada kg sobre el peso incluido.
      </p>

      <Card className="py-0">
        {error ? (
          <p className="p-6 text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Trayecto</TableHead>
                <TableHead className="text-right">Tarifa base</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Tiempo estimado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                {esAdmin && <TableHead className="pr-4 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((r) => (
                <TableRow key={r.id} className={r.operativa ? '' : 'opacity-60'}>
                  <TableCell className="pl-4">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {r.origen.nombre}
                      {r.origen.id === r.destino.id ? (
                        <Badge variant="secondary">urbano</Badge>
                      ) : (
                        <>
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                          {r.destino.nombre}
                        </>
                      )}
                      {r.activa && !r.operativa && (
                        <Badge
                          variant="outline"
                          className="font-normal text-muted-foreground"
                          title="Una de sus ciudades está inactiva: no admite envíos nuevos"
                        >
                          No operativa · ciudad inactiva
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.tarifaBase)}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {formatDuracion(r.tiempoEstimadoMin)}
                  </TableCell>
                  <TableCell className="text-center">
                    {esAdmin ? (
                      <Switch
                        checked={r.activa}
                        onCheckedChange={(v) => toggleActiva(r, v)}
                        aria-label={`Activar ruta ${r.origen.nombre} a ${r.destino.nombre}`}
                      />
                    ) : (
                      <Badge variant={r.activa ? 'secondary' : 'outline'}>{r.activa ? 'Activa' : 'Inactiva'}</Badge>
                    )}
                  </TableCell>
                  {esAdmin && (
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar ruta" onClick={() => setEditando(r)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EditarRutaDialog ruta={editando} onClose={() => setEditando(null)} />
    </>
  )
}
