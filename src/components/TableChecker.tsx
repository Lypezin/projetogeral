'use client'

import React, { useState } from 'react'
import { Database, AlertCircle, CheckCircle, TestTube, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { testSingleInsert, clearAllData } from '@/lib/importUtils'

export default function TableChecker() {
  const [checking, setChecking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [result, setResult] = useState<{
    connected: boolean
    tableExists: boolean
    error?: string
    tables?: string[]
  } | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [clearResult, setClearResult] = useState<any>(null)

  const checkConnection = async () => {
    setChecking(true)
    setResult(null)

    try {
      // Teste 1: Verificar conexão com Supabase
      const { data: connectionTest, error: connectionError } = await supabase
        .from('_test_')
        .select('*')
        .limit(1)

      if (connectionError && !connectionError.message.includes('relation "_test_" does not exist')) {
        throw new Error(`Erro de conexão: ${connectionError.message}`)
      }

      // Teste 2: Verificar se a tabela delivery_data existe
      try {
        const { data, error } = await supabase
          .from('delivery_data')
          .select('*')
          .limit(1)

        if (!error) {
          setResult({
            connected: true,
            tableExists: true,
            tables: ['delivery_data']
          })
          return
        }
      } catch (e) {
        // Tabela não existe
      }

      // Se chegou aqui, a tabela delivery_data não existe
      // Vamos listar outras tabelas que possam existir
      const possibleTables = [
        'dados_empresa', 
        'entregadores', 
        'corridas', 
        'data', 
        'empresa_dados',
        'empresa'
      ]

      const existingTables: string[] = []

      for (const tableName of possibleTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)

          if (!error) {
            existingTables.push(tableName)
          }
        } catch (e) {
          // Tabela não existe, continue
        }
      }

      setResult({
        connected: true,
        tableExists: false,
        tables: existingTables
      })

    } catch (error) {
      setResult({
        connected: false,
        tableExists: false,
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setChecking(false)
    }
  }

  const testInsertion = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await testSingleInsert()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error })
    } finally {
      setTesting(false)
    }
  }

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
          onClick={checkConnection}
          disabled={checking}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {checking ? 'Verificando...' : 'Testar Conexão'}
        </button>

        <button
          onClick={testInsertion}
          disabled={testing}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
        >
          <TestTube className="mr-2 h-4 w-4" />
          {testing ? 'Testando...' : 'Testar Inserção'}
        </button>

        <button
          onClick={clearDatabase}
          disabled={clearing}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {clearing ? 'Limpando...' : 'Limpar Banco'}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          {/* Status da Conexão */}
          <div className={`flex items-center p-3 rounded ${
            result.connected 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {result.connected ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <span className={`font-medium ${
              result.connected ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.connected ? 'Conectado ao Supabase' : 'Falha na conexão'}
            </span>
          </div>

          {/* Status da Tabela */}
          {result.connected && (
            <div className={`flex items-center p-3 rounded ${
              result.tableExists 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {result.tableExists ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              )}
              <span className={`font-medium ${
                result.tableExists ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {result.tableExists 
                  ? 'Tabela "delivery_data" encontrada' 
                  : 'Tabela "delivery_data" não encontrada'
                }
              </span>
            </div>
          )}

          {/* Lista de Tabelas Encontradas */}
          {result.tables && result.tables.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="font-medium text-blue-800 mb-2">
                Tabelas encontradas ({result.tables.length}):
              </p>
              <ul className="list-disc list-inside text-blue-700 text-sm">
                {result.tables.map(table => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Erro */}
          {result.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="font-medium text-red-800 mb-1">Erro:</p>
              <p className="text-red-700 text-sm">{result.error}</p>
            </div>
          )}

          {/* Instruções */}
          {result.connected && !result.tableExists && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded">
              <p className="font-medium text-gray-800 mb-2">
                Para criar a tabela no Supabase:
              </p>
              <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto">
{`CREATE TABLE delivery_data (
  id SERIAL PRIMARY KEY,
  data_do_periodo TEXT,
  periodo TEXT,
  duracao_do_periodo TEXT,
  numero_minimo_de_entregadores_regulares_na_escala INTEGER,
  tag TEXT,
  id_da_pessoa_entregadora TEXT,
  pessoa_entregadora TEXT,
  praca TEXT,
  sub_praca TEXT,
  origem TEXT,
  tempo_disponivel_escalado TEXT,
  tempo_disponivel_absoluto TEXT,
  numero_de_corridas_ofertadas INTEGER,
  numero_de_corridas_aceitas INTEGER,
  numero_de_corridas_rejeitadas INTEGER,
  numero_de_corridas_completadas INTEGER,
  numero_de_corridas_canceladas_pela_pessoa_entregadora INTEGER,
  numero_de_pedidos_aceitos_e_concluidos INTEGER,
  soma_das_taxas_das_corridas_aceitas DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);`}
              </pre>
            </div>
          )}
        </div>
      )}

      {testResult && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-800 mb-2">Resultado do Teste de Inserção:</h3>
          <div className={`p-3 rounded ${
            testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {testResult.success ? (
              <div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Teste bem-sucedido!</span>
                </div>
                <pre className="text-xs mt-2 text-green-700 overflow-x-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">Erro no teste:</span>
                </div>
                <pre className="text-xs mt-2 text-red-700 overflow-x-auto">
                  {JSON.stringify(testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

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
