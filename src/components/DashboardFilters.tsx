'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Navigation, Filter, X, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/providers/auth-provider'

export interface DashboardFiltersType {
  startDate: string
  endDate: string
  subPracas: string[]
  origens: string[]
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: DashboardFiltersType) => void
  loading?: boolean
}

export default function DashboardFilters({ onFiltersChange, loading }: DashboardFiltersProps) {
  const { permissions } = useAuth()
  const [filters, setFilters] = useState<DashboardFiltersType>({
    startDate: '',
    endDate: '',
    subPracas: [],
    origens: []
  })
  
  const [availableSubPracas, setAvailableSubPracas] = useState<string[]>([])
  const [availableOrigens, setAvailableOrigens] = useState<string[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadFilterOptions()
  }, [permissions])

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true)

      // Query base respeitando permissões
      let query = supabase
        .from('delivery_data')
        .select('sub_praca, origem')
        .not('sub_praca', 'is', null)
        .not('origem', 'is', null)
        .neq('sub_praca', '')
        .neq('origem', '')

      // Aplicar filtro de permissões se não for admin
      if (!permissions?.is_admin && permissions?.allowed_pracas?.length) {
        query = query.in('praca', permissions.allowed_pracas)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Erro ao carregar opções de filtro:', error)
        return
      }

      // Extrair valores únicos
      const subPracas = Array.from(new Set(data.map((item: any) => item.sub_praca))).sort() as string[]
      const origens = Array.from(new Set(data.map((item: any) => item.origem))).sort() as string[]

      setAvailableSubPracas(subPracas)
      setAvailableOrigens(origens)
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error)
    } finally {
      setLoadingOptions(false)
    }
  }

  const updateFilters = (key: keyof DashboardFiltersType, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: 'subPracas' | 'origens', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) 
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }))
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      subPracas: [],
      origens: []
    })
  }

  const hasActiveFilters = filters.startDate || filters.endDate || 
                          filters.subPracas.length > 0 || filters.origens.length > 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      {/* Header dos Filtros */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Filtros</h3>
            {hasActiveFilters && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {[
                  filters.startDate && 'Data',
                  filters.subPracas.length && `${filters.subPracas.length} Sub-praça(s)`,
                  filters.origens.length && `${filters.origens.length} Origem(ns)`
                ].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo dos Filtros */}
      {showFilters && (
        <div className="p-6 space-y-6">
          {/* Filtros de Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilters('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilters('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filtro de Sub-praças */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                Sub-praças ({availableSubPracas.length} disponíveis)
              </label>
              
              {loadingOptions ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando opções...
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-gray-50">
                  {availableSubPracas.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Nenhuma sub-praça encontrada
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {availableSubPracas.map((subPraca) => (
                        <label key={subPraca} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.subPracas.includes(subPraca)}
                            onChange={() => toggleArrayFilter('subPracas', subPraca)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 truncate" title={subPraca}>
                            {subPraca}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {filters.subPracas.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Selecionadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {filters.subPracas.map((subPraca) => (
                      <span
                        key={subPraca}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {subPraca.length > 20 ? subPraca.slice(0, 20) + '...' : subPraca}
                        <button
                          onClick={() => toggleArrayFilter('subPracas', subPraca)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filtro de Origens */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Navigation className="w-4 h-4 mr-2 text-blue-600" />
                Origens ({availableOrigens.length} disponíveis)
              </label>
              
              {loadingOptions ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando opções...
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-gray-50">
                  {availableOrigens.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Nenhuma origem encontrada
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {availableOrigens.map((origem) => (
                        <label key={origem} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.origens.includes(origem)}
                            onChange={() => toggleArrayFilter('origens', origem)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 truncate" title={origem}>
                            {origem}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {filters.origens.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Selecionadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {filters.origens.map((origem) => (
                      <span
                        key={origem}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {origem.length > 20 ? origem.slice(0, 20) + '...' : origem}
                        <button
                          onClick={() => toggleArrayFilter('origens', origem)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo dos Filtros */}
          {hasActiveFilters && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Filtros Ativos:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                {filters.startDate && (
                  <p>• Data inicial: {new Date(filters.startDate).toLocaleDateString('pt-BR')}</p>
                )}
                {filters.endDate && (
                  <p>• Data final: {new Date(filters.endDate).toLocaleDateString('pt-BR')}</p>
                )}
                {filters.subPracas.length > 0 && (
                  <p>• Sub-praças: {filters.subPracas.length} selecionada(s)</p>
                )}
                {filters.origens.length > 0 && (
                  <p>• Origens: {filters.origens.length} selecionada(s)</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
