'use client'

import React from 'react'
import { Calendar, Filter } from 'lucide-react'

interface DateFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onApplyFilter: () => void
  onClearFilter: () => void
}

export default function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyFilter,
  onClearFilter
}: DateFilterProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Filtro de Data
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Data Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Inicial
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Selecione a data inicial"
            />
          </div>
        </div>

        {/* Data Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Final
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Selecione a data final"
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-end gap-3">
          <button
            onClick={onApplyFilter}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Aplicar Filtro
          </button>
          <button
            onClick={onClearFilter}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Status do Filtro */}
      {(startDate || endDate) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Filtro ativo:</strong> 
            {startDate && ` De ${new Date(startDate).toLocaleDateString('pt-BR')}`}
            {endDate && ` Até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
      )}
    </div>
  )
}
