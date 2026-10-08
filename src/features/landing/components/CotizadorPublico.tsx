import { Clock, Loader2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TipoCargaPicker } from '@/features/envios/components/TipoCargaPicker'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDuracion } from '@/lib/format'
import type { CatalogoPublico, TipoCargaCodigo } from '@/types/api'
import { useCotizacionPublica } from '../api'
import { buscarRuta } from '../cobertura'
import { whatsappUrl } from '../marca'

export function CotizadorPublico({ catalogo }: { catalogo: CatalogoPublico }) {
  const { ciudades, rutas, tiposCarga } = catalogo
  const [origen, setOrigen] = useState<string | null>(null)
  const [destino, setDestino] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoCargaCodigo | undefined>()
  const [peso, setPeso] = useState('')

  const ciudadItems = Object.fromEntries(ciudades.map((c) => [String(c.id), c.nombre]))
  const ruta = origen && destino ? buscarRuta(rutas, Number(origen), Number(destino)) : undefined
  const tipoSel = tiposCarga.find((t) => t.codigo === tipo)
  const pesoKg = Number(peso.replace(',', '.'))
  const pesoValido = peso !== '' && pesoKg > 0 && (!tipoSel || pesoKg <= tipoSel.pesoMaxKg)

  const solicitud = useDebounced(ruta && tipo && pesoValido ? { rutaId: ruta.id, tipoCarga: tipo, pesoKg } : null, 300)
  const { data, isFetching, error } = useCotizacionPublica(solicitud)

  const sinRuta = origen && destino && !ruta
  const resumen =
    ruta && tipoSel && pesoValido
      ? `Hola PCargo, quiero enviar un ${tipoSel.nombre.toLowerCase()} de ${pesoKg} kg de ${ruta.origen.nombre} a ${ruta.destino.nombre}.`
      : undefined

  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Select items={ciudadItems} value={origen} onValueChange={(v) => setOrigen(v as string | null)}>
              <SelectTrigger className="w-full" aria-label="Ciudad de origen">
                <SelectValue placeholder="Ciudad de origen" />
              </SelectTrigger>
              <SelectContent>
                {ciudades.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Select items={ciudadItems} value={destino} onValueChange={(v) => setDestino(v as string | null)}>
              <SelectTrigger className="w-full" aria-label="Ciudad de destino">
                <SelectValue placeholder="Ciudad de destino" />
              </SelectTrigger>
              <SelectContent>
                {ciudades.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>¿Qué envías?</Label>
          <TipoCargaPicker tipos={tiposCarga} value={tipo} onChange={setTipo} />
        </div>

        <div className="space-y-2 sm:max-w-48">
          <Label htmlFor="cotizador-peso">Peso aproximado (kg)</Label>
          <Input
            id="cotizador-peso"
            inputMode="decimal"
            placeholder="Ej. 2,5"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            aria-invalid={peso !== '' && !pesoValido}
          />
          {peso !== '' && !pesoValido && (
            <p className="text-xs text-destructive">
              {tipoSel && pesoKg > tipoSel.pesoMaxKg
                ? `${tipoSel.nombre}: máximo ${tipoSel.pesoMaxKg} kg`
                : 'Ingresa un peso mayor a 0'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 rounded-xl bg-muted/50 p-5" aria-live="polite">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Costo estimado</p>
          {sinRuta ? (
            <p className="text-sm">Por ahora no operamos esa ruta.</p>
          ) : error ? (
            <p className="text-sm text-destructive">{errorMessage(error)}</p>
          ) : data && solicitud ? (
            <>
              <p className="flex items-center gap-2 text-4xl font-semibold tracking-tight">
                {formatCurrency(data.costo)}
                {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </p>
              {ruta && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-3.5" /> Entrega estimada en {formatDuracion(ruta.tiempoEstimadoMin)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">
              {isFetching ? 'Calculando…' : 'Elige origen, destino, tipo y peso para ver el precio.'}
            </p>
          )}
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<a href={whatsappUrl(resumen)} target="_blank" rel="noreferrer" />}
        >
          <MessageCircle /> Solicitar envío por WhatsApp
        </Button>
      </div>
    </div>
  )
}
