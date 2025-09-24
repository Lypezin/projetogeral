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

  // Buscar datas disponíveis
  const fetchAvailableDates = async () => {
    try {
      setLoadingDates(true)
      const { data, error } = await supabase
        .from('delivery_data')
        .select('data_do_periodo')
        .not('data_do_periodo', 'is', null)
        .order('data_do_periodo', { ascending: true })

      if (error) throw error

      // Agrupar por data e contar registros
      const dateMap = new Map<string, number>()
      data?.forEach((row: any) => {
        const date = row.data_do_periodo?.split('T')[0] // Pegar apenas a data
        if (date) {
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        }
      })

      // Converter para array e formatar
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
    } catch (error) {
      console.error('Erro ao buscar datas disponíveis:', error)
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

      {/* Status do Filtro */}
      {(startDate || endDate) && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                🎯 Filtro ativo:
              </p>
              <p className="text-sm text-blue-700">
                {startDate && `De ${new Date(startDate).toLocaleDateString('pt-BR')}`}
                {startDate && endDate && ' até '}
                {endDate && `Até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <button
              onClick={onClearFilter}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Datas */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📅 Selecionar {selectedDateType === 'start' ? 'Data Inicial' : 'Data Final'}
              </h3>
              <button
                onClick={() => {
                  setShowDatePicker(false)
                  setSelectedDateType(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {loadingDates ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Carregando datas...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableDates.map((dateInfo) => (
                    <button
                      key={dateInfo.date}
                      onClick={() => handleDateSelect(dateInfo.date)}
                      className="text-left p-3 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{dateInfo.formatted}</p>
                          <p className="text-sm text-gray-500">{dateInfo.count} registros</p>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
