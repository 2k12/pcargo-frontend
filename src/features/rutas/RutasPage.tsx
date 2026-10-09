import { ArrowRight, Clock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useEsAdmin } from '@/features/auth/hooks'
import { mayoreoTexto, precioTipoTexto, TIPOS_CARGA_DEFAULT } from '@/features/envios/domain'
import { TIPO_CARGA_ICON } from '@/features/envios/ui'
import { useTiposCarga } from '@/features/envios/hooks'
import { errorMessage } from '@/lib/api'
import { formatDuracion } from '@/lib/format'
import { cn } from '@/lib/utils'
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
    (a, b) => a.origen.nombre.localeCompare(b.origen.nombre, 'es') || a.tiempoEstimadoMin - b.tiempoEstimadoMin,
  )
  // Rutas agrupadas por ciudad de origen (proximidad): cada grupo se lee como "desde aquí, hacia…".
  const porOrigen = new Map<string, Ruta[]>()
  for (const r of ordenadas) porOrigen.set(r.origen.nombre, [...(porOrigen.get(r.origen.nombre) ?? []), r])

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
        description="Ciudades donde operamos, trayectos con su tiempo estimado y precios por tipo de carga"
        actions={esAdmin ? <NuevaRutaDialog /> : undefined}
      />

      <CiudadesCobertura rutas={rutas ?? []} esAdmin={esAdmin} />

      {error ? (
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6" aria-label="Rutas">
          {[...porOrigen].map(([origen, grupo]) => (
            <section key={origen} className="space-y-2" aria-label={`Desde ${origen}`}>
              <SectionLabel as="h2" aside={`${grupo.length} ${grupo.length === 1 ? 'ruta' : 'rutas'}`}>
                Desde {origen}
              </SectionLabel>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.map((r) => (
                  <li key={r.id}>
                    <Card size="sm" className={cn('h-full gap-3 px-4', !r.operativa && 'opacity-60')}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                          {r.origen.id === r.destino.id ? (
                            <>
                              {r.origen.nombre}
                              <Badge variant="secondary">urbano</Badge>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="size-3.5 text-muted-foreground" />
                              {r.destino.nombre}
                            </>
                          )}
                        </p>
                        {esAdmin ? (
                          <Switch
                            checked={r.activa}
                            onCheckedChange={(v) => toggleActiva(r, v)}
                            aria-label={`Activar ruta ${r.origen.nombre} a ${r.destino.nombre}`}
                          />
                        ) : (
                          <Badge variant={r.activa ? 'secondary' : 'outline'}>{r.activa ? 'Activa' : 'Inactiva'}</Badge>
                        )}
                      </div>
                      {r.activa && !r.operativa && (
                        <Badge
                          variant="outline"
                          className="w-fit font-normal text-muted-foreground"
                          title="Una de sus ciudades está inactiva: no admite envíos nuevos"
                        >
                          No operativa · ciudad inactiva
                        </Badge>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-xl font-semibold tracking-tight tabular-nums">
                            <Clock className="size-4 text-muted-foreground" />
                            {formatDuracion(r.tiempoEstimadoMin)}
                          </p>
                          <p className="text-xs text-muted-foreground">tiempo estimado</p>
                        </div>
                        {esAdmin && (
                          <Button variant="ghost" size="icon-sm" aria-label="Editar ruta" onClick={() => setEditando(r)}>
                            <Pencil />
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Precios por tipo de carga</CardTitle>
          <CardDescription>Precio por unidad según el tipo; la ruta no influye y no hay recargo por peso.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Precios por tipo de carga">
            {tipos.map((t) => {
              const Icon = TIPO_CARGA_ICON[t.codigo]
              return (
                <li key={t.codigo} className="flex items-start gap-3">
                  <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm">
                    <span className="block font-medium">{t.nombre}</span>
                    <span className="block tabular-nums">{precioTipoTexto(t)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[mayoreoTexto(t), `máx ${t.pesoMaxKg} kg por unidad`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <EditarRutaDialog ruta={editando} onClose={() => setEditando(null)} />
    </>
  )
}
