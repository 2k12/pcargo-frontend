import { ArrowUpRight, FileJson } from 'lucide-react'
import { Link } from 'react-router'
import { BloqueCodigo } from '@/components/BloqueCodigo'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCiudades } from '@/features/rutas/hooks'
import type { Integracion } from '@/types/api'
import { destinoEjemplo, ejemploCurl, ejemploFetch, ejemploVerificacionNode, urlBaseIntegraciones } from '../domain'

/** Ejemplos listos para copiar con los datos reales de la integración (ciudad de origen). */
export function ComoIntegrarse({ integracion }: { integracion: Integracion }) {
  const { data: ciudades = [] } = useCiudades(true)
  const base = urlBaseIntegraciones()
  const destino = destinoEjemplo(
    integracion.ciudadOrigen,
    ciudades.map((c) => c.nombre),
  )
  const opciones = { base, ciudadOrigen: integracion.ciudadOrigen, destino }

  return (
    <section className="space-y-4" aria-label="Cómo integrarse">
      <div className="space-y-1 text-sm">
        <p>
          La empresa envía sus pedidos a <code className="rounded bg-muted px-1 font-mono text-xs">{base}</code> con su API key.
          Los envíos salen de <strong>{integracion.ciudadOrigen}</strong> a nombre de <strong>{integracion.remitente.nombre}</strong>; el
          body solo lleva el destinatario (con su ciudad) y la carga.
        </p>
        <p className="text-muted-foreground">
          Cada creación exige la cabecera <code className="font-mono text-xs">Idempotency-Key</code>: si la empresa reintenta con la
          misma clave y el mismo body, recibe la misma respuesta sin duplicar el envío.
        </p>
      </div>

      <Tabs defaultValue="curl">
        <TabsList>
          <TabsTrigger value="curl">curl</TabsTrigger>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
          <TabsTrigger value="firma">Firma del webhook</TabsTrigger>
        </TabsList>
        <TabsContent value="curl">
          <BloqueCodigo titulo="curl" lenguaje="bash" codigo={ejemploCurl(opciones)} />
        </TabsContent>
        <TabsContent value="js">
          <BloqueCodigo titulo="JavaScript (fetch)" lenguaje="js" codigo={ejemploFetch(opciones)} />
        </TabsContent>
        <TabsContent value="firma">
          <BloqueCodigo titulo="Node: verificar webhook-signature" lenguaje="js" codigo={ejemploVerificacionNode()} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/desarrolladores" target="_blank" />}>
          Guía para desarrolladores
          <ArrowUpRight />
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={`${base}/openapi.json`} target="_blank" rel="noopener noreferrer" />}
        >
          <FileJson />
          Especificación OpenAPI
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </Button>
      </div>
    </section>
  )
}
