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
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  const handleImportComplete = () => {
    // Força o dashboard a recarregar os dados
    setRefreshKey(prev => prev + 1)
  }

  // Debug: mostrar informações de loading
  console.log('🏠 HomePage: Renderizando...')
  console.log('👤 HomePage - User:', user?.email)
  console.log('👑 HomePage - É admin?', permissions?.is_admin)

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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <UserHeader />
      
      <main className="py-8">
        <div className="container mx-auto px-4">
          {/* Header Moderno */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl mb-6 shadow-lg">
              <span className="text-3xl">📊</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
              Dashboard Empresarial
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Análise inteligente de dados com insights em tempo real
            </p>
            
            {/* Botão de Admin Moderno */}
            {permissions?.is_admin && (
              <div className="mt-8">
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className={`group relative px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3 mx-auto ${
                    showAdminPanel
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{showAdminPanel ? '👑' : '⚙️'}</span>
                    <span className="text-lg">
                      {showAdminPanel ? 'Fechar Painel Admin' : 'Abrir Painel Admin'}
                    </span>
                  </div>
                  <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                </button>
              </div>
            )}
          </div>


          {/* Painel Administrativo (apenas para admins) */}
          {permissions?.is_admin && showAdminPanel && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">✅ Usuário é administrador - Painel admin ativo</p>
              </div>
              <AdminPanel />
            </>
          )}

          {/* Conteúdo principal (apenas quando não está no painel admin) */}
          {!showAdminPanel && (
            <>
              {/* Verificação do Supabase */}
              {permissions?.is_admin && <TableChecker />}

              {/* Componente de Importação */}
              <ImportExcel onImportComplete={handleImportComplete} />

              {/* Dashboard */}
              <Dashboard key={refreshKey} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
