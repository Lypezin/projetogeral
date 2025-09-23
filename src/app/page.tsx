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

  // Debug: mostrar informações de loading
  console.log('🏠 HomePage: Renderizando...')
  console.log('👤 HomePage - User:', user?.email)
  console.log('📋 HomePage - Permissions:', permissions)
  console.log('🔄 HomePage - Loading:', loading)

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    console.log('⏳ HomePage: Mostrando tela de loading...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
          <p className="text-sm text-gray-400 mt-2">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não está logado, mostrar tela de login
  if (!user) {
    return <LoginForm />
  }

  // Se está logado, mostrar dashboard
  console.log('🏠 HomePage: Usuário logado, mostrando dashboard...')
  console.log('👑 HomePage: É admin?', permissions?.is_admin)
  
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

          {/* Debug: Status das permissões */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Debug - Status do Sistema:</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Usuário:</strong> {user?.email || 'Não logado'}</p>
              <p><strong>ID do Usuário:</strong> {user?.id || 'N/A'}</p>
              <p><strong>Permissões:</strong> {permissions ? JSON.stringify(permissions) : 'Nenhuma'}</p>
              <p><strong>É Admin:</strong> {permissions?.is_admin ? '✅ Sim' : '❌ Não'}</p>
              <p><strong>Loading:</strong> {loading ? '⏳ Sim' : '✅ Não'}</p>
            </div>
          </div>

          {/* Painel Administrativo (apenas para admins) */}
          {permissions?.is_admin && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">✅ Usuário é administrador - Mostrando painel admin</p>
              </div>
              <AdminPanel />
            </>
          )}

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
