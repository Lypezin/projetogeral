'use client'

import React, { useState } from 'react'
import { Database, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { clearAllData } from '@/lib/importUtils'

export default function TableChecker() {
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState<any>(null)


  const clearDatabase = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Isso vai excluir TODOS os dados da tabela delivery_data. Tem certeza?')) {
      return
    }

    setClearing(true)
    setClearResult(null)

    try {
      const result = await clearAllData()
      setClearResult({ success: true, message: 'Todos os dados foram removidos com sucesso!' })
    } catch (error) {
      setClearResult({ success: false, error })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Database className="mr-2 text-blue-600" />
        Verificação do Supabase
      </h2>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={clearDatabase}
          disabled={clearing}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {clearing ? 'Limpando...' : 'Limpar Banco'}
        </button>
      </div>


      {clearResult && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-800 mb-2">Resultado da Limpeza:</h3>
          <div className={`p-3 rounded ${
            clearResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {clearResult.success ? (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">{clearResult.message}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Erro na limpeza:</span>
                </div>
                <pre className="text-xs mt-2 text-red-700 overflow-x-auto">
                  {JSON.stringify(clearResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
