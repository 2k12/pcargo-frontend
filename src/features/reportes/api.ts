import { enviosApi } from '@/features/envios/api'
import type { Envio } from '@/types/api'

const POR_PAGINA = 100

export const reportesApi = {
  /**
   * Guías registradas ese día (hora de Ecuador, contrato v16), sin las canceladas, de menor a mayor número.
   * Recorre todas las páginas: el reporte necesita la lista completa.
   */
  guiasDelDia: async (fecha: string): Promise<Envio[]> => {
    const todas: Envio[] = []
    for (let pagina = 1; ; pagina++) {
      const r = await enviosApi.listar({ desde: fecha, hasta: fecha, pagina, porPagina: POR_PAGINA })
      todas.push(...r.datos)
      if (pagina >= r.totalPaginas) break
    }
    return todas.filter((e) => e.estado !== 'CANCELADO').sort((a, b) => a.numeroGuia - b.numeroGuia)
  },
}
