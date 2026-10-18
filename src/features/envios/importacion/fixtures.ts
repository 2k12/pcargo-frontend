// Datos de prueba de la importación (catálogo y rutas mínimos).
import type { Ruta, TipoCargaPublico } from '@/types/api'

export const TIPOS: TipoCargaPublico[] = [
  { codigo: 'SOBRE', nombre: 'Sobre', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 0.5 },
  { codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
  { codigo: 'CARTON', nombre: 'Cartón', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 35 },
  { codigo: 'TELA', nombre: 'Rollo de tela', precio: 1.25, precioRural: 1.5, mayoreo: { minimoExclusivo: 50, precio: 1 }, pesoMaxKg: 50 },
]

const ciudad = (id: number, nombre: string) => ({ id, nombre, activa: true })
export const RUTAS: Ruta[] = [
  { id: 7, origen: ciudad(1, 'Ibarra'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 150, activa: true, operativa: true },
  { id: 1, origen: ciudad(1, 'Ibarra'), destino: ciudad(1, 'Ibarra'), tiempoEstimadoMin: 60, activa: true, operativa: true },
  { id: 9, origen: ciudad(3, 'Otavalo'), destino: ciudad(4, 'Quito'), tiempoEstimadoMin: 120, activa: false, operativa: false },
]
