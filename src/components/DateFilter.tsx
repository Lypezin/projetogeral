'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Filter, Clock, TrendingUp, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface DateFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onApplyFilter: () => void
  onClearFilter: () => void
}

interface DateWithData {
  date: string
  count: number
  formatted: string
}

export default function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyFilter,
  onClearFilter
}: DateFilterProps) {
  const [availableDates, setAvailableDates] = useState<DateWithData[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDateType, setSelectedDateType] = useState<'start' | 'end' | null>(null)
  const supabase = createClient()

  // Buscar datas disponíveis usando RPC (sem limitação de 1000 registros)
  const fetchAvailableDates = async () => {
    try {
      setLoadingDates(true)
      console.log('📅 Buscando datas disponíveis via RPC...')
      
      const { data, error } = await supabase.rpc('get_available_dates')

      if (error) {
        console.error('❌ Erro na RPC get_available_dates:', error)
        throw error
      }

      console.log('✅ Datas encontradas via RPC:', data?.length || 0)

      // Converter para o formato esperado
      const datesWithData: DateWithData[] = (data || []).map((row: any) => ({
        date: row.date,
        count: parseInt(row.count),
        formatted: row.formatted
      }))

      setAvailableDates(datesWithData)
      console.log('📊 Datas processadas:', datesWithData.length)
    } catch (error) {
      console.error('💥 Erro ao buscar datas disponíveis:', error)
      
      // Fallback: tentar método tradicional (limitado a 1000)
      try {
        console.log('🔄 Tentando método fallback...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('delivery_data')
          .select('data_do_periodo')
          .not('data_do_periodo', 'is', null)
          .order('data_do_periodo', { ascending: true })
          .limit(1000)

        if (fallbackError) throw fallbackError

        const dateMap = new Map<string, number>()
        fallbackData?.forEach((row: any) => {
          const date = row.data_do_periodo?.split('T')[0]
          if (date) {
            dateMap.set(date, (dateMap.get(date) || 0) + 1)
          }
        })

        const datesWithData: DateWithData[] = Array.from(dateMap.entries())
          .map(([date, count]) => ({
            date,
            count,
            formatted: new Date(date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setAvailableDates(datesWithData)
        console.log('⚠️ Usando fallback limitado a 1000 registros')
      } catch (fallbackError) {
        console.error('💥 Erro no fallback:', fallbackError)
        setAvailableDates([])
      }
    } finally {
      setLoadingDates(false)
    }
  }

  useEffect(() => {
    fetchAvailableDates()
  }, [])

  const handleDateSelect = (date: string) => {
    if (selectedDateType === 'start') {
      onStartDateChange(date)
    } else if (selectedDateType === 'end') {
      onEndDateChange(date)
    }
    setShowDatePicker(false)
    setSelectedDateType(null)
  }

  const getDateRange = () => {
    if (availableDates.length === 0) return null
    const firstDate = availableDates[0].date
    const lastDate = availableDates[availableDates.length - 1].date
    return { firstDate, lastDate }
  }

  const dateRange = getDateRange()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Filtro Inteligente de Data
            </h3>
            <p className="text-sm text-gray-500">
              Selecione apenas períodos com dados disponíveis
            </p>
          </div>
        </div>
        
        {dateRange && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Período disponível</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(dateRange.firstDate).toLocaleDateString('pt-BR')} - {new Date(dateRange.lastDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Data Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📅 Data Inicial
          </label>
          <div className="space-y-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                min={dateRange?.firstDate}
                max={dateRange?.lastDate}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Selecione a data inicial"
              />
            </div>
            <button
              onClick={() => {
                setSelectedDateType('start')
                setShowDatePicker(true)
              }}
              className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm"
            >
              📋 Ver datas disponíveis
            </button>
          </div>
        </div>

        {/* Seleção de Data Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📅 Data Final
          </label>
          <div className="space-y-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                min={startDate || dateRange?.firstDate}
                max={dateRange?.lastDate}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Selecione a data final"
              />
            </div>
            <button
              onClick={() => {
                setSelectedDateType('end')
                setShowDatePicker(true)
              }}
              className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm"
            >
              📋 Ver datas disponíveis
            </button>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
        <div className="flex gap-3">
          <button
            onClick={onApplyFilter}
            disabled={!startDate && !endDate}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 disabled:cursor-not-allowed"
          >
            <Filter className="w-4 h-4" />
            Aplicar Filtro
          </button>
          <button
            onClick={onClearFilter}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{availableDates.length} dias com dados</span>
          </div>
          {startDate && endDate && (
            <div className="flex items-center gap-1 text-blue-600">
              <TrendingUp className="w-4 h-4" />
              <span>Filtro ativo</span>
            </div>
          )}
        </div>
      </div>

      {/* Status do Filtro com Visualização Detalhada */}
      {(startDate || endDate) && (
        <div className="mt-6 space-y-4">
          {/* Filtro Ativo */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-blue-800">
                  🎯 Filtro Ativo
                </p>
              </div>
              <button
                onClick={onClearFilter}
                className="text-blue-600 hover:text-blue-800 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-blue-700">
              {startDate && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">📅 Data Inicial:</span>
                  <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-semibold">
                    {new Date(startDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">📅 Data Final:</span>
                  <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-semibold">
                    {new Date(endDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dias Filtrados */}
          {startDate && endDate && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm font-medium text-green-800">
                  📊 Dias Filtrados
                </p>
              </div>
              <div className="text-sm text-green-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">📈 Período selecionado:</span>
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800 font-semibold">
                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">🗓️ De:</span>
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800 font-semibold">
                    {new Date(startDate).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-green-600">até</span>
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800 font-semibold">
                    {new Date(endDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resumo dos Dados */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm font-medium text-purple-800">
                📈 Resumo dos Dados
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {availableDates.length}
                </div>
                <div className="text-purple-700">Total de dias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {startDate && endDate ? 
                    availableDates.filter(d => 
                      d.date >= startDate && d.date <= endDate
                    ).length : 0
                  }
                </div>
                <div className="text-purple-700">Dias no filtro</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {startDate && endDate ? 
                    availableDates.filter(d => 
                      d.date >= startDate && d.date <= endDate
                    ).reduce((sum, d) => sum + d.count, 0) : 0
                  }
                </div>
                <div className="text-purple-700">Registros no filtro</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Datas Melhorado */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  📅 Selecionar {selectedDateType === 'start' ? 'Data Inicial' : 'Data Final'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {availableDates.length} dias com dados disponíveis
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDatePicker(false)
                  setSelectedDateType(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loadingDates ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 text-lg">Carregando datas disponíveis...</p>
                  <p className="text-gray-400 text-sm mt-2">Buscando todos os dias com dados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Estatísticas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{availableDates.length}</div>
                      <div className="text-sm text-blue-700">Total de dias</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {availableDates.reduce((sum, d) => sum + d.count, 0)}
                      </div>
                      <div className="text-sm text-purple-700">Total de registros</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(availableDates.reduce((sum, d) => sum + d.count, 0) / availableDates.length)}
                      </div>
                      <div className="text-sm text-green-700">Média por dia</div>
                    </div>
                  </div>

                  {/* Lista de Datas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableDates.map((dateInfo) => {
                      const isSelected = (selectedDateType === 'start' && dateInfo.date === startDate) ||
                                       (selectedDateType === 'end' && dateInfo.date === endDate)
                      const isInRange = startDate && endDate && 
                                       dateInfo.date >= startDate && dateInfo.date <= endDate
                      
                      return (
                        <button
                          key={dateInfo.date}
                          onClick={() => handleDateSelect(dateInfo.date)}
                          className={`text-left p-4 rounded-xl transition-all duration-200 border-2 ${
                            isSelected 
                              ? 'bg-blue-100 border-blue-300 shadow-md transform scale-105' 
                              : isInRange
                              ? 'bg-green-50 border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                isSelected ? 'bg-blue-500' : 
                                isInRange ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <span className="font-medium text-gray-900">{dateInfo.formatted}</span>
                            </div>
                            {isSelected && (
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                Selecionado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {dateInfo.count} registros
                            </span>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              dateInfo.count > 100 ? 'bg-red-100 text-red-700' :
                              dateInfo.count > 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {dateInfo.count > 100 ? 'Alto' : 
                               dateInfo.count > 50 ? 'Médio' : 'Baixo'}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
