'use client'

import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import ImportExcel from '@/components/ImportExcel'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportComplete = () => {
    // Força o dashboard a recarregar os dados
    setRefreshKey(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Dashboard Empresarial
          </h1>
          <p className="text-lg text-gray-600">
            Sistema de importação e análise de dados de entregadores
          </p>
        </div>

        {/* Componente de Importação */}
        <ImportExcel onImportComplete={handleImportComplete} />

        {/* Dashboard */}
        <Dashboard key={refreshKey} />
      </div>
    </main>
  )
}
