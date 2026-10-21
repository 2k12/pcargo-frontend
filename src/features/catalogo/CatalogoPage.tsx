import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArticulosPanel } from './components/ArticulosPanel'
import { HistorialTiposPanel } from './components/HistorialTiposPanel'
import { TiposCargaPanel } from './components/TiposCargaPanel'

const PESTANAS = [
  { value: 'tipos', label: 'Tipos de carga' },
  { value: 'historial', label: 'Historial de cambios' },
  { value: 'articulos', label: 'Qué no transportamos' },
] as const
type Pestana = (typeof PESTANAS)[number]['value']

/** «Tarifas y tipos de carga» (solo ADMIN, contrato v11): catálogo de tipos, su historial y los artículos restringidos. */
export function CatalogoPage() {
  const [params, setParams] = useSearchParams()
  const pedida = params.get('tab')
  const tab: Pestana = PESTANAS.some((p) => p.value === pedida) ? (pedida as Pestana) : 'tipos'

  return (
    <>
      <PageHeader
        title="Tarifas y tipos de carga"
        description="Precios por unidad, mayoreo, peso máximo y lo que no transportamos. Los cambios se publican de inmediato."
      />
      <Tabs
        value={tab}
        onValueChange={(v) =>
          setParams(
            (p) => {
              if (v === 'tipos') p.delete('tab')
              else p.set('tab', String(v))
              return p
            },
            { replace: true },
          )
        }
      >
        <div className="-mx-4 relative overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList>
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="tipos" className="pt-2">
          <TiposCargaPanel />
        </TabsContent>
        <TabsContent value="historial" className="pt-2">
          <HistorialTiposPanel />
        </TabsContent>
        <TabsContent value="articulos" className="pt-2">
          <ArticulosPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
