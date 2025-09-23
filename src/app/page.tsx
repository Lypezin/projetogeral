'use client'

import React, { useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import LoginForm from '@/components/LoginForm'
import UserHeader from '@/components/UserHeader'
import ImportExcel from '@/components/ImportExcel'
import Dashboard from '@/components/DashboardOptimized'
import TableChecker from '@/components/TableChecker'
import AdminPanel from '@/components/AdminPanel'

export default function Home() {
  const { user, permissions, loading } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportComplete = () => {
    // Força o dashboard a recarregar os dados
    setRefreshKey(prev => prev + 1)
  }

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não está logado, mostrar tela de login
  if (!user) {
    return <LoginForm />
  }

  // Se está logado, mostrar dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Dashboard Empresarial
            </h1>
            <p className="text-lg text-gray-600">
              Sistema de importação e análise de dados de entregadores
            </p>
          </div>

          {/* Painel Administrativo (apenas para admins) */}
          {permissions?.is_admin && <AdminPanel />}

          {/* Verificação do Supabase */}
          {permissions?.is_admin && <TableChecker />}

          {/* Componente de Importação */}
          <ImportExcel onImportComplete={handleImportComplete} />

          {/* Dashboard */}
          <Dashboard key={refreshKey} />
        </div>
      </main>
    </div>
  )
}
