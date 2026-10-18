import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CircleCheck, Loader2, Search, TriangleAlert, UserX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { digitos } from '@/features/clientes/domain'
import { ATENCION_TONO } from '@/features/envios/ui'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { cn } from '@/lib/utils'
import type { DatosTitular, SolicitudDatos } from '@/types/api'
import { datosPersonalesApi } from '../api'
import { CANAL_LABEL, CANALES, contar, porAnonimizar, resumenSolicitud, solicitudSchema, titularSinDatos, type SolicitudFormValues } from '../domain'
import { useAtenderSolicitud } from '../hooks'

/** Una fila del resumen: lo que se borra (figura) frente a lo que no se toca (fondo). */
function Fila({ valor, texto, tono }: { valor: number | string; texto: string; tono?: 'borra' | 'conserva' | 'atencion' }) {
  return (
    <li className="flex items-baseline gap-3 py-2">
      <span
        className={cn(
          'w-10 shrink-0 text-right text-lg font-semibold tabular-nums',
          tono === 'borra' && 'text-destructive',
          tono === 'conserva' && 'text-muted-foreground',
        )}
      >
        {valor}
      </span>
      <span className="text-sm">{texto}</span>
    </li>
  )
}

function Resumen({ titular }: { titular: DatosTitular }) {
  const { envios, cliente } = titular
  if (titularSinDatos(titular)) {
    return (
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        No hay envíos ni clientes con este teléfono. Puedes registrar la solicitud igualmente para dejar constancia.
      </p>
    )
  }
  return (
    <ul className="divide-y" aria-label="Qué se elimina">
      <Fila valor={porAnonimizar(titular)} texto="envíos terminados: se borran nombres, teléfonos, direcciones, notas y fotos" tono="borra" />
      {cliente && (
        <Fila
          valor={1}
          texto={`cliente frecuente «${cliente.nombre}» se elimina${
            cliente.accesosPortal ? ` y se desactivan ${contar(cliente.accesosPortal, 'acceso', 'accesos')} al portal` : ''
          }`}
          tono="borra"
        />
      )}
      {envios.anonimizados > 0 && <Fila valor={envios.anonimizados} texto="envíos ya estaban anonimizados" tono="conserva" />}
      {envios.enCurso > 0 && <Fila valor={envios.enCurso} texto="envíos en curso no se tocan todavía" tono="atencion" />}
    </ul>
  )
}

const VACIO: SolicitudFormValues = { nombreTitular: '', canal: 'PRESENCIAL', nota: '' }

/**
 * Derecho de eliminación del titular, en tres pasos: buscar el teléfono → revisar qué se borra y
 * registrar quién lo pide → confirmar (es irreversible) y ver el resultado.
 */
export function SolicitudEliminacion() {
  const [telefono, setTelefono] = useState('')
  const [errorTel, setErrorTel] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<SolicitudFormValues | null>(null)
  const [resultado, setResultado] = useState<SolicitudDatos | null>(null)
  const buscar = useMutation({ mutationFn: (tel: string) => datosPersonalesApi.titular(tel) })
  const atender = useAtenderSolicitud()
  const titular = buscar.data
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SolicitudFormValues>({ resolver: zodResolver(solicitudSchema), defaultValues: VACIO })

  const onBuscar = (e: FormEvent) => {
    e.preventDefault()
    const n = digitos(telefono).length
    if (n < 7 || n > 15) {
      setErrorTel('Escribe un teléfono de 7 a 15 dígitos')
      return
    }
    setErrorTel(null)
    setResultado(null)
    reset(VACIO)
    buscar.mutate(telefono.trim())
  }

  const ejecutar = async () => {
    if (!confirmar || !titular) return
    try {
      const r = await atender.mutateAsync({
        telefono: titular.telefono,
        nombreTitular: confirmar.nombreTitular,
        canal: confirmar.canal,
        ...(confirmar.nota ? { nota: confirmar.nota } : {}),
      })
      setResultado(r)
      setConfirmar(null)
      toast.success('Solicitud atendida')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const nueva = () => {
    setResultado(null)
    setTelefono('')
    buscar.reset()
    reset(VACIO)
  }

  const canalItems = Object.fromEntries(CANALES.map((c) => [c, CANAL_LABEL[c]]))

  if (resultado) {
    return (
      <div className={cn('space-y-4 p-4', SUPERFICIE)} role="status" aria-label="Resultado de la solicitud">
        <p className="flex items-center gap-2 font-medium">
          <CircleCheck className="size-5 text-brand-green-text" />
          Datos de {resultado.nombreTitular} eliminados
        </p>
        <ul className="space-y-0.5 text-sm">
          {resumenSolicitud(resultado.resultado).map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
        {resultado.resultado.enCurso > 0 && (
          <p className={cn('flex items-start gap-2 rounded-lg p-3 text-xs', ATENCION_TONO)}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {contar(resultado.resultado.enCurso, 'envío sigue en curso', 'envíos siguen en curso')}: vuelve a atender la solicitud
            cuando termine{resultado.resultado.enCurso === 1 ? '' : 'n'}.
          </p>
        )}
        <Button variant="outline" onClick={nueva}>
          Atender otra solicitud
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-5 p-4', SUPERFICIE)}>
      <form onSubmit={onBuscar} noValidate className="space-y-1.5" aria-label="Buscar titular">
        <Label htmlFor="telefono-titular">Teléfono del titular</Label>
        <div className="flex gap-2">
          <Input
            id="telefono-titular"
            inputMode="tel"
            autoComplete="off"
            placeholder="0991234567"
            className="max-w-56"
            value={telefono}
            aria-invalid={!!errorTel}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={buscar.isPending}>
            {buscar.isPending ? <Loader2 className="animate-spin" /> : <Search />}
            Buscar
          </Button>
        </div>
        {(errorTel || buscar.error) && <p className="text-xs text-destructive">{errorTel ?? errorMessage(buscar.error)}</p>}
      </form>

      {titular && (
        <>
          <Resumen titular={titular} />
          <form
            onSubmit={handleSubmit((v) => setConfirmar(v))}
            noValidate
            className="grid gap-4 border-t pt-4 sm:grid-cols-2"
            aria-label="Datos de la solicitud"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nombre-titular">Nombre del titular</Label>
              <Input id="nombre-titular" autoComplete="off" aria-invalid={!!errors.nombreTitular} {...register('nombreTitular')} />
              {errors.nombreTitular && <p className="text-xs text-destructive">{errors.nombreTitular.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Controller
                control={control}
                name="canal"
                render={({ field }) => (
                  <Select items={canalItems} value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full" aria-label="Canal de la solicitud">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANALES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CANAL_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nota-solicitud">
                Nota <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea id="nota-solicitud" rows={2} maxLength={300} placeholder="Ej. presentó su cédula en la oficina" {...register('nota')} />
              {errors.nota && <p className="text-xs text-destructive">{errors.nota.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="destructive">
                <UserX />
                Eliminar datos…
              </Button>
            </div>
          </form>
        </>
      )}

      <Confirmar
        abierto={!!confirmar}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={ejecutar}
        titulo="¿Eliminar definitivamente?"
        descripcion={
          <>
            Esta acción es <strong className="text-foreground">irreversible</strong>: los datos personales de {titular?.telefono} no se
            podrán recuperar. Se conservan solo las cifras de los envíos (guía, ruta, costos y estados) por obligaciones contables.
          </>
        }
        accion="Eliminar definitivamente"
        pendiente={atender.isPending}
      />
    </div>
  )
}
