import { createClient } from '@/lib/supabase-client'

// Interface para estatísticas do dashboard
export interface DashboardStats {
  total_records: number
  total_ofertadas: number
  total_aceitas: number
  total_rejeitadas: number
  total_completadas: number
  total_canceladas: number
  total_pedidos_concluidos: number
  total_taxas: number
  data_range: {
    start_date: string
    end_date: string
  }
  pracas_disponiveis: string[]
}

// Interface para dados por praça
export interface DataByPraca {
  praca: string
  ofertadas: number
  aceitas: number
  rejeitadas: number
  completadas: number
}

// Interface para dados por período
export interface DataByPeriod {
  data: string
  ofertadas: number
  aceitas: number
  rejeitadas: number
  completadas: number
}

export class DashboardAPI {
  private supabase = createClient()

  /**
   * Obter estatísticas gerais do dashboard
   * @param userId ID do usuário (opcional, usa o atual se não especificado)
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   * @param subPracas Sub-praças filtradas (opcional)
   * @param origens Origens filtradas (opcional)
   */
  async getDashboardStats(
    userId?: string,
    startDate?: string,
    endDate?: string,
    subPracas?: string[],
    origens?: string[]
  ): Promise<{ data: DashboardStats | null; error: any }> {
    try {
      const { data, error } = await this.supabase.rpc('get_dashboard_stats', {
        user_id_param: userId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        sub_pracas: subPracas && subPracas.length > 0 ? subPracas : null,
        origens: origens && origens.length > 0 ? origens : null
      })

      if (error) {
        console.error('Erro ao obter estatísticas do dashboard:', error)
        return { data: null, error }
      }

      // Verificar se há erro de acesso
      if (data && data.error) {
        return { data: null, error: { message: data.error } }
      }

      return { data: data as DashboardStats, error: null }
    } catch (error) {
      console.error('Erro inesperado ao obter estatísticas:', error)
      return { data: null, error }
    }
  }

  /**
   * Obter dados agrupados por praça
   * @param userId ID do usuário (opcional, usa o atual se não especificado)
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   * @param subPracas Sub-praças filtradas (opcional)
   * @param origens Origens filtradas (opcional)
   */
  async getDataByPraca(
    userId?: string,
    startDate?: string,
    endDate?: string,
    subPracas?: string[],
    origens?: string[]
  ): Promise<{ data: DataByPraca[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase.rpc('get_data_by_praca', {
        user_id_param: userId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        sub_pracas: subPracas && subPracas.length > 0 ? subPracas : null,
        origens: origens && origens.length > 0 ? origens : null
      })

      if (error) {
        console.error('Erro ao obter dados por praça:', error)
        return { data: null, error }
      }

      // Verificar se há erro de acesso
      if (data && data.error) {
        return { data: null, error: { message: data.error } }
      }

      return { data: data as DataByPraca[], error: null }
    } catch (error) {
      console.error('Erro inesperado ao obter dados por praça:', error)
      return { data: null, error }
    }
  }

  /**
   * Obter dados agrupados por período
   * @param userId ID do usuário (opcional, usa o atual se não especificado)
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   */
  async getDataByPeriod(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: DataByPeriod[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase.rpc('get_data_by_period', {
        user_id_param: userId || null,
        start_date: startDate || null,
        end_date: endDate || null
      })

      if (error) {
        console.error('Erro ao obter dados por período:', error)
        return { data: null, error }
      }

      // Verificar se há erro de acesso
      if (data && data.error) {
        return { data: null, error: { message: data.error } }
      }

      return { data: data as DataByPeriod[], error: null }
    } catch (error) {
      console.error('Erro inesperado ao obter dados por período:', error)
      return { data: null, error }
    }
  }

  /**
   * Verificar se há dados na tabela (função auxiliar)
   */
  async hasData(): Promise<{ hasData: boolean; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('id')
        .limit(1)

      if (error) {
        return { hasData: false, error }
      }

      return { hasData: (data && data.length > 0), error: null }
    } catch (error) {
      return { hasData: false, error }
    }
  }

  /**
   * Obter lista de praças disponíveis para o usuário
   */
  async getAvailablePracas(userId?: string): Promise<{ data: string[] | null; error: any }> {
    try {
      const { data: statsData, error } = await this.getDashboardStats(userId)
      
      if (error || !statsData) {
        return { data: null, error }
      }

      return { data: statsData.pracas_disponiveis || [], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// Instância singleton para uso global
export const dashboardAPI = new DashboardAPI()
