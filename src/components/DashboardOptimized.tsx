'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { dashboardAPI, DashboardStats, DataByPraca } from '@/lib/dashboard-api'
import DashboardFilters, { DashboardFiltersType } from './DashboardFilters'
import DateFilter from './DateFilter'

interface MetricCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  percentage?: number
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, bgColor, borderColor, percentage }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 relative overflow-hidden group">
    {/* Background gradient on hover */}
    <div className={`absolute inset-0 ${bgColor} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${bgColor} ${color} rounded-xl flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        {percentage !== undefined && (
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taxa</div>
            <div className={`text-lg font-bold ${color}`}>
              {percentage.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
          {title}
        </h3>
        <p className="text-3xl font-bold text-gray-900">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)

export default function DashboardOptimized() {
  const { user, permissions } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pracaData, setPracaData] = useState<DataByPraca[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<DashboardFiltersType>({
    startDate: '',
    endDate: '',
    subPracas: [],
    origens: []
  })
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })

  // Filtros temporariamente desativados
  const handleFiltersChange = useCallback((newFilters: DashboardFiltersType) => {
    setFilters(newFilters)
  }, [])

  // Handlers para filtro de data
  const handleDateFilterChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleApplyDateFilter = useCallback(() => {
    console.log('📅 Aplicando filtro de data:', dateFilter)
    const newFilters = {
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate
    }
    console.log('🔄 Novos filtros:', newFilters)
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
    // Recarregar dados será feito pelo useEffect
  }, [dateFilter])

  const handleClearDateFilter = useCallback(() => {
    setDateFilter({ startDate: '', endDate: '' })
    setFilters(prev => ({
      ...prev,
      startDate: '',
      endDate: ''
    }))
    // Recarregar dados será feito pelo useEffect
  }, [])

  const loadDashboardData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log('🔄 Carregando dados com filtros:', filters)

      // Carregar dados em paralelo COM filtros
      const [statsResult, pracaResult] = await Promise.all([
        dashboardAPI.getDashboardStats(user?.id, filters.startDate, filters.endDate, filters.subPracas, filters.origens),
        dashboardAPI.getDataByPraca(user?.id, filters.startDate, filters.endDate, filters.subPracas, filters.origens)
      ])

      if (statsResult.error) {
        throw new Error(statsResult.error.message || 'Erro ao carregar estatísticas')
      }

      if (pracaResult.error) {
        console.warn('Erro ao carregar dados por praça:', pracaResult.error)
      }

      setStats(statsResult.data)
      setPracaData(pracaResult.data || [])

    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error)
      setError(error.message || 'Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters]) // Incluir filtros nas dependências

  // Carregar dados apenas quando o usuário muda
  useEffect(() => {
    if (user) {
      loadDashboardData()
    } else {
      // Reset states quando não há usuário
      setStats(null)
      setPracaData([])
      setError(null)
    }
  }, [user, loadDashboardData])

  // Recarregar dados quando filtros de data mudarem
  useEffect(() => {
    console.log('🔄 useEffect filtros - user:', user?.id, 'filters:', filters)
    if (user && (filters.startDate || filters.endDate)) {
      console.log('📊 Recarregando dados com filtros:', filters)
      loadDashboardData(true)
    }
  }, [filters.startDate, filters.endDate, user, loadDashboardData])

  // Filtros desativados temporariamente para resolver loop

  const handleRefresh = () => {
    loadDashboardData(true)
  }

  // Dados para o gráfico de barras
  const chartData = pracaData.slice(0, 10).map(item => ({
    name: item.praca.length > 15 ? item.praca.slice(0, 15) + '...' : item.praca,
    fullName: item.praca,
    Ofertadas: item.ofertadas,
    Aceitas: item.aceitas,
    Rejeitadas: item.rejeitadas,
    Completadas: item.completadas
  }))

  // Dados para o gráfico de pizza
  const pieData = stats ? [
    { name: 'Aceitas', value: stats.total_aceitas, color: '#10b981' },
    { name: 'Rejeitadas', value: stats.total_rejeitadas, color: '#ef4444' },
    { name: 'Completadas', value: stats.total_completadas, color: '#3b82f6' },
  ] : []

  // Custom tooltip para gráfico de barras
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 mb-2">{data.fullName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Custom tooltip para gráfico de pizza
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium" style={{ color: data.payload.color }}>
            {data.name}: {data.value.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadDashboardData()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
          <p className="text-gray-600">
            {permissions?.is_admin 
              ? 'Importe dados para visualizar o dashboard' 
              : 'Você não tem permissão para visualizar dados ou não há dados disponíveis'
            }
          </p>
        </div>
      </div>
    )
  }

  const totalOfertadas = stats.total_ofertadas

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="space-y-8">
        {/* Filtro de Data */}
        <DateFilter
          startDate={dateFilter.startDate}
          endDate={dateFilter.endDate}
          onStartDateChange={(date) => handleDateFilterChange('startDate', date)}
          onEndDateChange={(date) => handleDateFilterChange('endDate', date)}
          onApplyFilter={handleApplyDateFilter}
          onClearFilter={handleClearDateFilter}
        />

        {/* Header moderno */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/20 rounded-3xl overflow-hidden">
          <div className="px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Insights em tempo real dos seus dados de entrega</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="font-semibold">
                  {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 space-y-8">
      {/* Filtros temporariamente desativados para resolver loop */}
      {/* <DashboardFilters onFiltersChange={handleFiltersChange} loading={loading || refreshing} /> */}

          {/* Informações de permissão */}
          {permissions && !permissions.is_admin && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-amber-800">
                    Visualização Limitada
                  </p>
                  <p className="text-amber-700 mt-1">
                    Dados limitados às praças: <span className="font-medium">{permissions.allowed_pracas.join(', ')}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Corridas Ofertadas"
          value={stats.total_ofertadas}
          icon={<Activity size={28} />}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
        />
        
        <MetricCard
          title="Corridas Aceitas"
          value={stats.total_aceitas}
          icon={<CheckCircle size={28} />}
          color="text-green-600"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          percentage={totalOfertadas > 0 ? (stats.total_aceitas / totalOfertadas) * 100 : 0}
        />
        
        <MetricCard
          title="Corridas Rejeitadas"
          value={stats.total_rejeitadas}
          icon={<XCircle size={28} />}
          color="text-red-600"
          bgColor="bg-red-50"
          borderColor="border-red-200"
          percentage={totalOfertadas > 0 ? (stats.total_rejeitadas / totalOfertadas) * 100 : 0}
        />
        
        <MetricCard
          title="Corridas Completadas"
          value={stats.total_completadas}
          icon={<Clock size={28} />}
          color="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          percentage={totalOfertadas > 0 ? (stats.total_completadas / totalOfertadas) * 100 : 0}
        />
      </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Gráfico de barras por praça */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Performance por Praça
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Top 10 praças com mais movimento</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total</span>
                  <div className="text-lg font-bold text-gray-900">
                    {pracaData.length} praças
                  </div>
                </div>
              </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Ofertadas" fill="#3b82f6" />
                <Bar dataKey="Aceitas" fill="#10b981" />
                <Bar dataKey="Completadas" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhum dado disponível para gráfico
            </div>
          )}
        </div>

            {/* Gráfico de pizza */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Distribuição de Status
                </h3>
                <p className="text-gray-600 text-sm mt-1">Proporção de corridas por status</p>
              </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhum dado disponível para gráfico
            </div>
          )}
        </div>
      </div>

          {/* Informações adicionais */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resumo Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Total de Registros</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_records.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Período dos Dados</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.data_range.start_date}
                </p>
                <p className="text-sm text-gray-600">até {stats.data_range.end_date}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Valor Total (Taxas)</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats.total_taxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
