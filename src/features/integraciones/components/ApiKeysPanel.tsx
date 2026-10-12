import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/api'
import { formatDateTime, formatRelativo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Alcance, ApiKey, Integracion, ModoApiKey } from '@/types/api'
import { ALCANCE_LABEL, ALCANCES, MODO_LABEL } from '../domain'
import { useCrearKey, useRevocarKey } from '../hooks'
import { Confirmar } from './Confirmar'
import { SecretoUnaVez } from './SecretoUnaVez'

const keySchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  modo: z.enum(['live', 'test']),
  alcances: z.array(z.enum(['envios:crear', 'envios:leer', 'cotizar'])).min(1, 'Elige al menos un alcance'),
})
type KeyValues = z.infer<typeof keySchema>

export function ModoBadge({ modo }: { modo: ModoApiKey }) {
  return (
    <Badge variant={modo === 'live' ? 'default' : 'outline'} className="font-mono">
      {modo === 'live' ? 'live' : 'test'}
      <span className="sr-only"> ({MODO_LABEL[modo]})</span>
    </Badge>
  )
}

function CrearKeyDialog({
  open,
  onOpenChange,
  integracionId,
  onCreada,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  integracionId: string
  onCreada: (key: string) => void
}) {
  const crear = useCrearKey(integracionId)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KeyValues>({
    resolver: zodResolver(keySchema),
    defaultValues: { nombre: '', modo: 'live', alcances: ['envios:crear', 'envios:leer', 'cotizar'] },
  })

  const onSubmit = async (v: KeyValues) => {
    try {
      const { key } = await crear.mutateAsync({ nombre: v.nombre.trim(), modo: v.modo, alcances: v.alcances })
      reset()
      onOpenChange(false)
      onCreada(key)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear API key</DialogTitle>
          <DialogDescription>La key completa se muestra una sola vez, al crearla.</DialogDescription>
        </DialogHeader>
        <form id="crear-key" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="key-nombre">Nombre</Label>
            <Input id="key-nombre" placeholder="Servidor de producción" autoComplete="off" aria-invalid={!!errors.nombre} {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <Controller
            control={control}
            name="modo"
            render={({ field }) => (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Modo</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['live', 'test'] as const).map((m) => (
                    <label
                      key={m}
                      className={cn(
                        'flex cursor-pointer flex-col gap-0.5 rounded-lg p-3 text-sm ring-1 ring-foreground/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        field.value === m && 'bg-accent ring-primary/60',
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <input
                          type="radio"
                          name="key-modo"
                          value={m}
                          checked={field.value === m}
                          onChange={() => field.onChange(m)}
                          className="accent-primary"
                        />
                        {MODO_LABEL[m]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m === 'live' ? 'Crea envíos reales.' : 'Valida y cotiza sin guardar nada.'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <Controller
            control={control}
            name="alcances"
            render={({ field }) => (
              <fieldset className="space-y-2" aria-describedby={errors.alcances ? 'key-alcances-error' : undefined}>
                <legend className="text-sm font-medium">Alcances</legend>
                {ALCANCES.map((a) => {
                  const id = `key-alcance-${a.value.replace(':', '-')}`
                  const marcado = field.value.includes(a.value)
                  return (
                    <div key={a.value} className="flex items-start gap-2.5">
                      <Checkbox
                        id={id}
                        checked={marcado}
                        onCheckedChange={(c) =>
                          field.onChange(c ? [...field.value, a.value] : field.value.filter((x: Alcance) => x !== a.value))
                        }
                        className="mt-0.5"
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={id}>{a.label}</Label>
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.value} · {a.descripcion}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {errors.alcances && (
                  <p id="key-alcances-error" className="text-xs text-destructive">
                    {errors.alcances.message}
                  </p>
                )}
              </fieldset>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="crear-key" disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="animate-spin" />}
            Crear key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** API keys de la integración: crear (se muestra una vez) y revocar (inmediato e irreversible). */
export function ApiKeysPanel({ integracion }: { integracion: Integracion }) {
  const [creando, setCreando] = useState(false)
  const [keyNueva, setKeyNueva] = useState<string | null>(null)
  const [revocando, setRevocando] = useState<ApiKey | null>(null)
  const revocar = useRevocarKey(integracion.id)
  // Activas primero; luego las revocadas.
  const keys = [...integracion.keys].sort(
    (a, b) => Number(!!a.revocadaEn) - Number(!!b.revocadaEn) || b.creadaEn.localeCompare(a.creadaEn),
  )

  const confirmarRevocar = async () => {
    if (!revocando) return
    try {
      await revocar.mutateAsync(revocando.id)
      toast.success(`Key «${revocando.nombre}» revocada`)
      setRevocando(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <section className="space-y-3" aria-label="API keys">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Varias keys activas permiten rotar sin cortar el servicio: crea la nueva, cámbiala en la empresa y revoca la anterior.
        </p>
        <Button onClick={() => setCreando(true)}>
          <Plus />
          Crear key
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center">
          <KeyRound className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium">Sin API keys</p>
          <p className="text-sm text-muted-foreground">Crea una para que la empresa pueda conectarse.</p>
        </Card>
      ) : (
        <Card className="py-0">
          <Table aria-label="API keys">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nombre</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead className="hidden md:table-cell">Alcances</TableHead>
                <TableHead className="hidden lg:table-cell">Creada</TableHead>
                <TableHead className="hidden sm:table-cell">Último uso</TableHead>
                <TableHead className="pr-4 text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id} className={cn(k.revocadaEn && 'text-muted-foreground')}>
                  <TableCell className="pl-4 font-medium">{k.nombre}</TableCell>
                  <TableCell className="font-mono text-xs">{k.prefijo}…</TableCell>
                  <TableCell>
                    <ModoBadge modo={k.modo} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {k.alcances.map((a) => (
                        <Badge key={a} variant="secondary" className="font-normal" title={a}>
                          {ALCANCE_LABEL[a] ?? a}
                        </Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDateTime(k.creadaEn)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {k.ultimoUsoEn ? <span title={formatDateTime(k.ultimoUsoEn)}>{formatRelativo(k.ultimoUsoEn)}</span> : 'Nunca'}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {k.revocadaEn ? (
                      <Badge variant="outline" title={formatDateTime(k.revocadaEn)}>
                        Revocada
                      </Badge>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => setRevocando(k)} aria-label={`Revocar ${k.nombre}`}>
                        Revocar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CrearKeyDialog open={creando} onOpenChange={setCreando} integracionId={integracion.id} onCreada={setKeyNueva} />
      <SecretoUnaVez
        valor={keyNueva}
        titulo="API key creada"
        descripcion="Entrégala a la empresa por un canal seguro. Se usa en la cabecera Authorization: Bearer <key>."
        onCerrar={() => setKeyNueva(null)}
      />
      <Confirmar
        abierto={!!revocando}
        onCancelar={() => setRevocando(null)}
        onConfirmar={confirmarRevocar}
        pendiente={revocar.isPending}
        titulo="¿Revocar esta key?"
        descripcion={
          <>
            La key <strong className="font-mono">{revocando?.prefijo}</strong> dejará de funcionar de inmediato y no se puede
            reactivar. Las solicitudes que la usen recibirán 401.
          </>
        }
        accion="Revocar key"
      />
    </section>
  )
}
