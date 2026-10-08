import { INTERACTIVA, SELECCIONADA } from '@/lib/estilos'
import { cn } from '@/lib/utils'
import type { TipoCarga, TipoCargaCodigo } from '@/types/api'
import { TIPO_CARGA_ICON } from '../ui'

interface Props {
  tipos: TipoCarga[]
  value: TipoCargaCodigo | undefined
  onChange: (codigo: TipoCargaCodigo) => void
}

export function TipoCargaPicker({ tipos, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Tipo de carga" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tipos.map((t) => {
        const Icon = TIPO_CARGA_ICON[t.codigo]
        const activo = value === t.codigo
        return (
          <button
            key={t.codigo}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(t.codigo)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl p-3 text-sm ring-1 ring-foreground/10',
              INTERACTIVA,
              activo && SELECCIONADA,
            )}
          >
            <Icon className="size-5" />
            <span className="font-medium">{t.nombre}</span>
            <span className="text-[11px] text-muted-foreground">hasta {t.pesoMaxKg} kg</span>
          </button>
        )
      })}
    </div>
  )
}
