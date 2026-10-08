import { Search, UserPlus, X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Cliente } from '@/types/api'
import { buscarClientes } from '../domain'

const MAX_SUGERENCIAS = 6

/**
 * Buscador de clientes frecuentes (combobox): se escribe parte del nombre o del teléfono y se
 * elige con clic o con ↑ ↓ Enter. Si no aparece, la última opción ofrece registrarlo con lo escrito.
 */
export function ClienteBuscador({
  clientes,
  onSelect,
  onCrear,
  placeholder = 'Buscar cliente por nombre o teléfono',
  label = 'Buscar cliente',
  className,
}: {
  clientes: Cliente[]
  onSelect: (cliente: Cliente) => void
  /** Si se indica, ofrece "Registrar «texto» como cliente nuevo". */
  onCrear?: (texto: string) => void
  placeholder?: string
  label?: string
  className?: string
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const listaId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const sugerencias = buscarClientes(clientes, texto, MAX_SUGERENCIAS)
  const ofreceCrear = !!onCrear && texto.trim().length >= 2
  const total = sugerencias.length + (ofreceCrear ? 1 : 0)
  const visible = abierto && (texto.trim() !== '' || clientes.length > 0) && total > 0

  const elegir = (i: number) => {
    const c = sugerencias[i]
    if (c) onSelect(c)
    else if (ofreceCrear) onCrear!(texto.trim())
    setTexto('')
    setAbierto(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setAbierto(true)
      if (total > 0) setActivo((a) => (a + (e.key === 'ArrowDown' ? 1 : total - 1)) % total)
    } else if (e.key === 'Enter' && visible) {
      e.preventDefault()
      elegir(activo)
    } else if (e.key === 'Escape' && abierto) {
      e.stopPropagation() // no cerrar el diálogo que lo contiene
      setAbierto(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        role="combobox"
        aria-label={label}
        aria-expanded={visible}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={visible ? `${listaId}-${activo}` : undefined}
        autoComplete="off"
        className="pr-8 pl-8"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        // Retraso: deja que el clic en una opción llegue antes de cerrar la lista.
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onKeyDown={onKeyDown}
      />
      {texto && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setTexto('')
            inputRef.current?.focus()
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
      {visible && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {sugerencias.map((c, i) => (
            <li
              key={c.id}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm',
                i === activo && 'bg-accent text-accent-foreground',
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                {iniciales(c.nombre)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.nombre}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.telefono}
                  {c.direccion && ` · ${c.direccion}`}
                </span>
              </span>
              {c.envios > 0 && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{c.envios} env.</span>}
            </li>
          ))}
          {ofreceCrear && (
            <li
              id={`${listaId}-${sugerencias.length}`}
              role="option"
              aria-selected={activo === sugerencias.length}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActivo(sugerencias.length)}
              onClick={() => elegir(sugerencias.length)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-primary',
                sugerencias.length > 0 && 'mt-1 border-t border-border/60',
                activo === sugerencias.length && 'bg-accent',
              )}
            >
              <UserPlus className="size-4 shrink-0" />
              <span className="truncate">
                Registrar <strong>«{texto.trim()}»</strong> como cliente nuevo
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
