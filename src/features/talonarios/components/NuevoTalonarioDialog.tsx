import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import type { Talonario } from '@/types/api'
import {
  CANTIDAD_DEFECTO,
  MAX_CANTIDAD,
  MAX_NOTA,
  MIN_CANTIDAD,
  nuevoTalonarioSchema,
  numerosDe,
  rangoTalonario,
  type NuevoTalonarioValues,
} from '../domain'
import { useCrearTalonario } from '../hooks'
import { ImprimirGuiasEnBlanco } from './ImprimirGuiasEnBlanco'

const DEFECTO: NuevoTalonarioValues = { cantidad: CANTIDAD_DEFECTO, nota: '' }

function Formulario({ onCreado, onCancelar }: { onCreado: (t: Talonario) => void; onCancelar: () => void }) {
  const crear = useCrearTalonario()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NuevoTalonarioValues>({ resolver: zodResolver(nuevoTalonarioSchema), defaultValues: DEFECTO })

  const onSubmit = async (v: NuevoTalonarioValues) => {
    try {
      const nota = v.nota?.trim()
      const t = await crear.mutateAsync({ cantidad: v.cantidad, ...(nota ? { nota } : {}) })
      toast.success(`Talonario ${rangoTalonario(t)} reservado`)
      onCreado(t)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nuevo talonario</DialogTitle>
        <DialogDescription>
          Se reservan los siguientes números de guía para imprimirlos en blanco, llenarlos a mano en el camino y registrarlos después.
        </DialogDescription>
      </DialogHeader>
      <form id="form-talonario" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="talonario-cantidad">Cantidad de guías</Label>
          <Input
            id="talonario-cantidad"
            type="number"
            inputMode="numeric"
            min={MIN_CANTIDAD}
            max={MAX_CANTIDAD}
            className="w-28 tabular-nums"
            aria-invalid={!!errors.cantidad}
            {...register('cantidad', { valueAsNumber: true })}
          />
          <p className={errors.cantidad ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.cantidad?.message ?? `Entre ${MIN_CANTIDAD} y ${MAX_CANTIDAD}. Van cuatro por hoja A4.`}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="talonario-nota">Nota (opcional)</Label>
          <Input
            id="talonario-nota"
            autoComplete="off"
            maxLength={MAX_NOTA}
            placeholder="Ej. Camión Quito – sábado"
            aria-invalid={!!errors.nota}
            {...register('nota')}
          />
          <p className={errors.nota ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.nota?.message ?? 'Para reconocerlo; va impresa en cada guía.'}
          </p>
        </div>
      </form>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" form="form-talonario" disabled={crear.isPending}>
          {crear.isPending && <Loader2 className="animate-spin" />}
          Reservar números
        </Button>
      </DialogFooter>
    </>
  )
}

function Creado({ talonario, onCerrar }: { talonario: Talonario; onCerrar: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-brand-green-text" />
          Talonario reservado
        </DialogTitle>
        <DialogDescription>
          Guías <span className="font-mono text-foreground">{rangoTalonario(talonario)}</span> ({talonario.cantidad}
          {talonario.cantidad === 1 ? ' guía' : ' guías'}){talonario.nota ? ` · ${talonario.nota}` : ''}. Imprímelas ahora o
          más tarde desde el talonario.
        </DialogDescription>
      </DialogHeader>
      <ImprimirGuiasEnBlanco numeros={numerosDe(talonario)} nota={talonario.nota} etiquetaImprimir="Imprimir guías" />
      <DialogFooter>
        <Button variant="ghost" nativeButton={false} render={<Link to={`/talonarios/${talonario.id}`} />} onClick={onCerrar}>
          Ver talonario
        </Button>
        <Button variant="outline" onClick={onCerrar}>
          Listo
        </Button>
      </DialogFooter>
    </>
  )
}

/** «Nuevo talonario»: reserva el bloque y, al crearlo, ofrece imprimir o descargar sus guías en blanco. */
export function NuevoTalonarioDialog() {
  const [abierto, setAbierto] = useState(false)
  const [creado, setCreado] = useState<Talonario | null>(null)
  const [aperturas, setAperturas] = useState(0)
  const cerrar = () => setAbierto(false)

  return (
    <>
      <Button
        onClick={() => {
          setCreado(null)
          setAperturas((n) => n + 1)
          setAbierto(true)
        }}
      >
        <Plus />
        Nuevo talonario
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          {creado ? (
            <Creado talonario={creado} onCerrar={cerrar} />
          ) : (
            <Formulario key={aperturas} onCreado={setCreado} onCancelar={cerrar} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
