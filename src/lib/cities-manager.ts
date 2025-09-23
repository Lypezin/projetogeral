// ===============================================
// GERENCIADOR DE CIDADES DINÂMICAS
// ===============================================

import { createClient } from './supabase-client'

export interface CityData {
  praca: string
  sub_pracas: string[]
  count: number
  last_import: string
}

export class CitiesManager {
  private supabase = createClient()

  /**
   * Obter todas as cidades disponíveis no sistema usando RPC
   */
  async getAvailableCities(): Promise<CityData[]> {
    try {
      console.log('🏙️ CitiesManager: Buscando cidades disponíveis via RPC...')

      const { data, error } = await this.supabase
        .rpc('get_available_cities')

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar cidades via RPC:', error)
        // Fallback: tentar método antigo se RPC falhar
        return await this.getAvailableCitiesFallback()
      }

      const cities: CityData[] = data.map((row: any) => ({
        praca: row.praca,
        sub_pracas: row.sub_pracas || [],
        count: parseInt(row.total_records) || 0,
        last_import: row.last_import
      }))

      console.log('✅ CitiesManager: Cidades encontradas via RPC:', cities.length)
      return cities
    } catch (error) {
      console.error('💥 CitiesManager: Erro inesperado:', error)
      // Fallback: tentar método antigo se RPC falhar
      return await this.getAvailableCitiesFallback()
    }
  }

  /**
   * Método fallback para buscar cidades (método antigo)
   */
  private async getAvailableCitiesFallback(): Promise<CityData[]> {
    try {
      console.log('🔄 CitiesManager: Usando método fallback...')

      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('praca, sub_praca, created_at')
        .order('praca')
        .limit(1000) // Limitar para evitar timeout

      if (error) {
        console.error('❌ CitiesManager: Erro no fallback:', error)
        return []
      }

      // Agrupar por praça e contar sub-praças
      const cityMap = new Map<string, CityData>()
      
      data.forEach((row: any) => {
        const praca = row.praca
        const subPraca = row.sub_praca
        const createdAt = row.created_at

        if (!cityMap.has(praca)) {
          cityMap.set(praca, {
            praca,
            sub_pracas: [],
            count: 0,
            last_import: createdAt
          })
        }

        const cityData = cityMap.get(praca)!
        if (!cityData.sub_pracas.includes(subPraca)) {
          cityData.sub_pracas.push(subPraca)
        }
        cityData.count++
        
        // Atualizar data do último import se for mais recente
        if (new Date(createdAt) > new Date(cityData.last_import)) {
          cityData.last_import = createdAt
        }
      })

      const cities = Array.from(cityMap.values())
      console.log('✅ CitiesManager: Cidades encontradas via fallback:', cities.length)
      return cities
    } catch (error) {
      console.error('💥 CitiesManager: Erro no fallback:', error)
      return []
    }
  }

  /**
   * Obter lista simples de cidades (apenas nomes) usando RPC
   */
  async getCitiesList(): Promise<string[]> {
    try {
      console.log('🏙️ CitiesManager: Buscando lista de cidades via RPC...')

      const { data, error } = await this.supabase
        .rpc('get_cities_list')

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar lista de cidades via RPC:', error)
        // Fallback: usar método completo
        const cities = await this.getAvailableCities()
        return cities.map(city => city.praca).sort()
      }

      const citiesList = data.map((row: any) => row.praca).sort()
      console.log('✅ CitiesManager: Lista de cidades via RPC:', citiesList.length)
      return citiesList
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao obter lista de cidades:', error)
      return []
    }
  }

  /**
   * Obter sub-praças de uma cidade específica usando RPC
   */
  async getSubPracasByCity(praca: string): Promise<string[]> {
    try {
      console.log(`🏙️ CitiesManager: Buscando sub-praças de ${praca} via RPC...`)

      const { data, error } = await this.supabase
        .rpc('get_sub_pracas_by_city', { city_name: praca })

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar sub-praças via RPC:', error)
        // Fallback: método antigo
        return await this.getSubPracasByCityFallback(praca)
      }

      const subPracas = data.map((row: any) => row.sub_praca).sort()
      console.log(`✅ CitiesManager: Sub-praças de ${praca} via RPC:`, subPracas.length)
      return subPracas
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao buscar sub-praças:', error)
      // Fallback: método antigo
      return await this.getSubPracasByCityFallback(praca)
    }
  }

  /**
   * Método fallback para buscar sub-praças
   */
  private async getSubPracasByCityFallback(praca: string): Promise<string[]> {
    try {
      console.log(`🔄 CitiesManager: Usando fallback para sub-praças de ${praca}...`)

      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('sub_praca')
        .eq('praca', praca)
        .order('sub_praca')
        .limit(1000) // Limitar para evitar timeout

      if (error) {
        console.error('❌ CitiesManager: Erro no fallback de sub-praças:', error)
        return []
      }

      const subPracas = Array.from(new Set(data.map((row: any) => row.sub_praca))).sort() as string[]
      console.log(`✅ CitiesManager: Sub-praças de ${praca} via fallback:`, subPracas.length)
      return subPracas
    } catch (error) {
      console.error('💥 CitiesManager: Erro no fallback de sub-praças:', error)
      return []
    }
  }

  /**
   * Verificar se uma cidade existe no sistema usando RPC
   */
  async cityExists(praca: string): Promise<boolean> {
    try {
      console.log(`🏙️ CitiesManager: Verificando se cidade ${praca} existe via RPC...`)

      const { data, error } = await this.supabase
        .rpc('city_exists', { city_name: praca })

      if (error) {
        console.error('❌ CitiesManager: Erro ao verificar cidade via RPC:', error)
        // Fallback: método antigo
        return await this.cityExistsFallback(praca)
      }

      const exists = data === true
      console.log(`✅ CitiesManager: Cidade ${praca} existe:`, exists)
      return exists
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao verificar cidade:', error)
      // Fallback: método antigo
      return await this.cityExistsFallback(praca)
    }
  }

  /**
   * Método fallback para verificar se cidade existe
   */
  private async cityExistsFallback(praca: string): Promise<boolean> {
    try {
      console.log(`🔄 CitiesManager: Usando fallback para verificar cidade ${praca}...`)

      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('praca')
        .eq('praca', praca)
        .limit(1)

      if (error) {
        console.error('❌ CitiesManager: Erro no fallback de verificação:', error)
        return false
      }

      const exists = data && data.length > 0
      console.log(`✅ CitiesManager: Cidade ${praca} existe via fallback:`, exists)
      return exists
    } catch (error) {
      console.error('💥 CitiesManager: Erro no fallback de verificação:', error)
      return false
    }
  }

  /**
   * Obter estatísticas das cidades usando RPC
   */
  async getCitiesStats(): Promise<{
    total_cities: number
    total_records: number
    cities_with_data: CityData[]
  }> {
    try {
      console.log('🏙️ CitiesManager: Buscando estatísticas via RPC...')

      const { data, error } = await this.supabase
        .rpc('get_cities_stats')

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar estatísticas via RPC:', error)
        // Fallback: usar método antigo
        return await this.getCitiesStatsFallback()
      }

      const stats = data[0]
      const cities_with_data: CityData[] = stats.cities_with_data.map((city: any) => ({
        praca: city.praca,
        sub_pracas: city.sub_pracas || [],
        count: city.count || 0,
        last_import: city.last_import
      }))

      const result = {
        total_cities: parseInt(stats.total_cities) || 0,
        total_records: parseInt(stats.total_records) || 0,
        cities_with_data
      }

      console.log('✅ CitiesManager: Estatísticas via RPC:', result.total_cities, 'cidades,', result.total_records, 'registros')
      return result
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao obter estatísticas:', error)
      // Fallback: usar método antigo
      return await this.getCitiesStatsFallback()
    }
  }

  /**
   * Método fallback para obter estatísticas
   */
  private async getCitiesStatsFallback(): Promise<{
    total_cities: number
    total_records: number
    cities_with_data: CityData[]
  }> {
    try {
      console.log('🔄 CitiesManager: Usando fallback para estatísticas...')

      const cities = await this.getAvailableCities()
      const totalRecords = cities.reduce((sum, city) => sum + city.count, 0)

      const result = {
        total_cities: cities.length,
        total_records: totalRecords,
        cities_with_data: cities
      }

      console.log('✅ CitiesManager: Estatísticas via fallback:', result.total_cities, 'cidades,', result.total_records, 'registros')
      return result
    } catch (error) {
      console.error('💥 CitiesManager: Erro no fallback de estatísticas:', error)
      return {
        total_cities: 0,
        total_records: 0,
        cities_with_data: []
      }
    }
  }

  /**
   * Atualizar permissões de cidades para um usuário
   */
  async updateUserCityPermissions(userId: string, allowedCities: string[]): Promise<boolean> {
    try {
      console.log('🔧 CitiesManager: Atualizando permissões de cidades para:', userId)
      console.log('🏙️ CitiesManager: Cidades permitidas:', allowedCities)

      const { error } = await this.supabase
        .from('user_permissions')
        .update({ 
          allowed_pracas: allowedCities,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('❌ CitiesManager: Erro ao atualizar permissões:', error)
        return false
      }

      console.log('✅ CitiesManager: Permissões atualizadas com sucesso')
      return true
    } catch (error) {
      console.error('💥 CitiesManager: Erro inesperado ao atualizar permissões:', error)
      return false
    }
  }

  /**
   * Obter permissões de cidades de um usuário
   */
  async getUserCityPermissions(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_permissions')
        .select('allowed_pracas')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar permissões:', error)
        return []
      }

      return data?.allowed_pracas || []
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao buscar permissões:', error)
      return []
    }
  }
}

// Instância singleton
export const citiesManager = new CitiesManager()
