'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react'
import { getDataStats } from '@/lib/importUtils'

interface DashboardStats {
  totalOfertadas: number
  totalAceitas: number
  totalRejeitadas: number
  totalCompletadas: number
  totalRegistros: number
}

interface MetricCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, bgColor, borderColor }) => (
  <div className={`${bgColor} ${borderColor} border rounded-lg p-6 card-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${color} mt-2`}>
          {value.toLocaleString()}
        </p>
      </div>
      <div className={`${color} opacity-80`}>
        {icon}
      </div>
    </div>
  </div>
)

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDataStats()
      setStats(data)
    } catch (err) {
      setError('Erro ao carregar estatísticas')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadStats}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-600">Nenhum dado encontrado. Importe uma planilha para ver as estatísticas.</p>
      </div>
    )
  }

  // Dados para os gráficos
  const chartData = [
    {
      name: 'Ofertadas',
      value: stats.totalOfertadas,
      color: '#3b82f6'
    },
    {
      name: 'Aceitas',
      value: stats.totalAceitas,
      color: '#10b981'
    },
    {
      name: 'Rejeitadas',
      value: stats.totalRejeitadas,
      color: '#ef4444'
    },
    {
      name: 'Completadas',
      value: stats.totalCompletadas,
      color: '#8b5cf6'
    }
  ]

  const pieData = chartData.filter(item => item.value > 0)

  // Cálculo de taxas
  const taxaAceitacao = stats.totalOfertadas > 0 ? (stats.totalAceitas / stats.totalOfertadas * 100) : 0
  const taxaRejeicao = stats.totalOfertadas > 0 ? (stats.totalRejeitadas / stats.totalOfertadas * 100) : 0
  const taxaComplementacao = stats.totalAceitas > 0 ? (stats.totalCompletadas / stats.totalAceitas * 100) : 0

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Dashboard - Dados da Empresa</h1>
        <p className="text-primary-100">
          Análise completa dos dados de entregadores • {stats.totalRegistros.toLocaleString()} registros
        </p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Corridas Ofertadas"
          value={stats.totalOfertadas}
          icon={<Activity className="h-8 w-8" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
        />
        <MetricCard
          title="Corridas Aceitas"
          value={stats.totalAceitas}
          icon={<CheckCircle className="h-8 w-8" />}
          color="text-green-600"
          bgColor="bg-green-50"
          borderColor="border-green-200"
        />
        <MetricCard
          title="Corridas Rejeitadas"
          value={stats.totalRejeitadas}
          icon={<XCircle className="h-8 w-8" />}
          color="text-red-600"
          bgColor="bg-red-50"
          borderColor="border-red-200"
        />
        <MetricCard
          title="Corridas Completadas"
          value={stats.totalCompletadas}
          icon={<TrendingUp className="h-8 w-8" />}
          color="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
        />
      </div>

      {/* Cards de Taxas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Aceitação</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {taxaAceitacao.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Rejeição</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {taxaRejeicao.toFixed(1)}%
              </p>
            </div>
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Complementação</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {taxaComplementacao.toFixed(1)}%
              </p>
            </div>
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="mr-2 text-primary-600" />
            Resumo das Corridas
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Distribuição das Corridas
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Botão para atualizar dados */}
      <div className="flex justify-center">
        <button
          onClick={loadStats}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          <Activity className="mr-2 h-4 w-4" />
          Atualizar Dados
        </button>
      </div>
    </div>
  )
}
