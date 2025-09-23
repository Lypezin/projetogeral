'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { dashboardAPI, DashboardStats, DataByPraca } from '@/lib/dashboard-api'

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
  <div className={`${bgColor} ${borderColor} border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${color} mt-2`}>
          {value.toLocaleString()}
        </p>
        {percentage !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            {percentage.toFixed(1)}% do total
          </p>
        )}
      </div>
      <div className={`${color} opacity-80`}>
        {icon}
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

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Carregar dados em paralelo
      const [statsResult, pracaResult] = await Promise.all([
        dashboardAPI.getDashboardStats(),
        dashboardAPI.getDataByPraca()
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
  }

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

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
    <div className="space-y-6">
      {/* Header com refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Informações de permissão */}
      {permissions && !permissions.is_admin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Visualização limitada
              </p>
              <p className="text-sm text-amber-700">
                Você está vendo dados apenas das praças: {permissions.allowed_pracas.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras por praça */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Dados por Praça (Top 10)
            </h3>
            <span className="text-sm text-gray-500">
              {pracaData.length} praças total
            </span>
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Distribuição de Status
          </h3>
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo dos Dados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total de Registros:</p>
            <p className="font-semibold text-gray-800">{stats.total_records.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Período dos Dados:</p>
            <p className="font-semibold text-gray-800">
              {stats.data_range.start_date} até {stats.data_range.end_date}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Valor Total (Taxas):</p>
            <p className="font-semibold text-gray-800">
              R$ {stats.total_taxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
