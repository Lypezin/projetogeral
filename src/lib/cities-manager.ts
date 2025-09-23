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
   * Obter todas as cidades disponíveis no sistema
   */
  async getAvailableCities(): Promise<CityData[]> {
    try {
      console.log('🏙️ CitiesManager: Buscando cidades disponíveis...')

      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('praca, sub_praca, created_at')
        .order('praca')

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar cidades:', error)
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
      console.log('✅ CitiesManager: Cidades encontradas:', cities.length)
      return cities
    } catch (error) {
      console.error('💥 CitiesManager: Erro inesperado:', error)
      return []
    }
  }

  /**
   * Obter lista simples de cidades (apenas nomes)
   */
  async getCitiesList(): Promise<string[]> {
    try {
      const cities = await this.getAvailableCities()
      return cities.map(city => city.praca).sort()
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao obter lista de cidades:', error)
      return []
    }
  }

  /**
   * Obter sub-praças de uma cidade específica
   */
  async getSubPracasByCity(praca: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('sub_praca')
        .eq('praca', praca)
        .order('sub_praca')

      if (error) {
        console.error('❌ CitiesManager: Erro ao buscar sub-praças:', error)
        return []
      }

      const subPracas = Array.from(new Set(data.map((row: any) => row.sub_praca))).sort() as string[]
      console.log(`✅ CitiesManager: Sub-praças de ${praca}:`, subPracas.length)
      return subPracas
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao buscar sub-praças:', error)
      return []
    }
  }

  /**
   * Verificar se uma cidade existe no sistema
   */
  async cityExists(praca: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('delivery_data')
        .select('praca')
        .eq('praca', praca)
        .limit(1)

      if (error) {
        console.error('❌ CitiesManager: Erro ao verificar cidade:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao verificar cidade:', error)
      return false
    }
  }

  /**
   * Obter estatísticas das cidades
   */
  async getCitiesStats(): Promise<{
    total_cities: number
    total_records: number
    cities_with_data: CityData[]
  }> {
    try {
      const cities = await this.getAvailableCities()
      const totalRecords = cities.reduce((sum, city) => sum + city.count, 0)

      return {
        total_cities: cities.length,
        total_records: totalRecords,
        cities_with_data: cities
      }
    } catch (error) {
      console.error('💥 CitiesManager: Erro ao obter estatísticas:', error)
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
