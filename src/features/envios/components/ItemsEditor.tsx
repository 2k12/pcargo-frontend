import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPeso } from '@/lib/format'
import type { TipoCarga } from '@/types/api'
import { pesoTotal, piezasLabel, totalPiezas } from '../domain'
import { itemVacio, MAX_ITEMS, type EnvioFormValues } from '../schema'
import { TIPO_CARGA_ICON } from '../ui'

interface Props {
  control: Control<EnvioFormValues>
  register: UseFormRegister<EnvioFormValues>
  errors: FieldErrors<EnvioFormValues>
  tipos: TipoCarga[]
}

/** Líneas del envío: tipo de carga, cantidad y peso por unidad (p. ej. 5 paquetes + 20 cartones). */
export function ItemsEditor({ control, register, errors, tipos }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' }) ?? []
  const tipoItems = Object.fromEntries(tipos.map((t) => [t.codigo, t.nombre]))

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_88px_120px_32px] gap-2 px-0.5 text-xs text-muted-foreground sm:grid">
        <span>Tipo</span>
        <span>Cantidad</span>
        <span>Peso por unidad (kg)</span>
        <span />
      </div>
      <ul className="space-y-2" aria-label="Ítems del envío">
        {fields.map((field, index) => {
          const err = errors.items?.[index]
          const tipo = tipos.find((t) => t.codigo === items[index]?.tipoCarga)
          return (
            <li key={field.id} className="grid grid-cols-[1fr_1fr_32px] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_88px_120px_32px] sm:border-0 sm:p-0">
              <div className="col-span-3 sm:col-span-1">
                <Controller
                  control={control}
                  name={`items.${index}.tipoCarga`}
                  render={({ field: f }) => (
                    <Select items={tipoItems} value={f.value ?? null} onValueChange={(v) => f.onChange(v ?? undefined)}>
                      <SelectTrigger className="w-full" aria-label={`Tipo del ítem ${index + 1}`} aria-invalid={!!err?.tipoCarga}>
                        <SelectValue placeholder="Tipo de carga" />
                      </SelectTrigger>
                      <SelectContent>
                        {tipos.map((t) => {
                          const Icon = TIPO_CARGA_ICON[t.codigo]
                          return (
                            <SelectItem key={t.codigo} value={t.codigo}>
                              <Icon className="size-3.5 text-muted-foreground" />
                              {t.nombre}
                              <span className="text-xs text-muted-foreground">hasta {t.pesoMaxKg} kg</span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {err?.tipoCarga && <p className="mt-1 text-xs text-destructive">{err.tipoCarga.message}</p>}
              </div>
              <div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  aria-label={`Cantidad del ítem ${index + 1}`}
                  aria-invalid={!!err?.cantidad}
                  {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                />
                {err?.cantidad && <p className="mt-1 text-xs text-destructive">{err.cantidad.message}</p>}
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  placeholder={tipo ? `máx. ${tipo.pesoMaxKg}` : 'kg'}
                  aria-label={`Peso por unidad del ítem ${index + 1}`}
                  aria-invalid={!!err?.pesoKg}
                  {...register(`items.${index}.pesoKg`, { valueAsNumber: true })}
                />
                {err?.pesoKg && <p className="mt-1 text-xs text-destructive">{err.pesoKg.message}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ítem ${index + 1}`}
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            </li>
          )
        })}
      </ul>
      {errors.items?.root?.message && <p className="text-xs text-destructive">{errors.items.root.message}</p>}
      {errors.items?.message && <p className="text-xs text-destructive">{errors.items.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_ITEMS}
          onClick={() => append(itemVacio() as EnvioFormValues['items'][number])}
        >
          <Plus /> Agregar ítem
        </Button>
        <p className="text-xs text-muted-foreground" data-testid="items-totales">
          Total: <span className="font-medium text-foreground">{piezasLabel(totalPiezas(items))}</span> ·{' '}
          {formatPeso(pesoTotal(items))}
        </p>
      </div>
    </div>
  )
}
