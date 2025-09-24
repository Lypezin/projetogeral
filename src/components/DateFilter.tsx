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
  const supabase = createClient()

  // Buscar datas disponíveis (método simplificado)
  const fetchAvailableDates = async () => {
    try {
      setLoadingDates(true)
      console.log('📅 Buscando datas disponíveis...')
      
      // Tentar RPC primeiro
      try {
        const { data, error } = await supabase.rpc('get_available_dates')
        
        if (!error && data) {
          console.log('✅ Datas encontradas via RPC:', data.length)
          const datesWithData: DateWithData[] = data.map((row: any) => ({
            date: row.date,
            count: parseInt(row.count),
            formatted: row.formatted
          }))
          setAvailableDates(datesWithData)
          return
        }
      } catch (rpcError) {
        console.log('⚠️ RPC não disponível, usando método tradicional')
      }
      
      // Fallback: método tradicional
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
      console.log('📊 Datas processadas:', datesWithData.length)
    } catch (error) {
      console.error('💥 Erro ao buscar datas disponíveis:', error)
      setAvailableDates([])
    } finally {
      setLoadingDates(false)
    }
  }

  useEffect(() => {
    fetchAvailableDates()
  }, [])


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
        </div>

        {/* Seleção de Data Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📅 Data Final
          </label>
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

    </div>
  )
}
