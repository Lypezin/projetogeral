'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { processExcelFile, importDataInBatches } from '@/lib/importUtils'
import toast from 'react-hot-toast'

interface ImportExcelProps {
  onImportComplete: () => void
}

export default function ImportExcel({ onImportComplete }: ImportExcelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<string>('')
  const [importStats, setImportStats] = useState<{
    success: number
    errors: number
    total: number
  } | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setCurrentFile(file.name)
    setImportStats(null)

    try {
      // Processa o arquivo Excel
      toast.loading('Processando arquivo Excel...', { id: 'processing' })
      const data = await processExcelFile(file)
      
      if (data.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo')
        return
      }

      toast.dismiss('processing')
      toast.loading(`Importando ${data.length} registros...`, { id: 'importing' })

      // Importa os dados em lotes
      const result = await importDataInBatches(data, (prog, current, total) => {
        setProgress(prog)
      })

      toast.dismiss('importing')

      setImportStats({
        success: result.success,
        errors: result.errors,
        total: data.length
      })

      if (result.success > 0) {
        toast.success(`${result.success} registros importados com sucesso!`)
        onImportComplete()
      }

      if (result.errors > 0) {
        toast.error(`${result.errors} registros falharam na importação`)
        console.error('Detalhes dos erros:', result.errorDetails)
      }

    } catch (error) {
      console.error('Erro na importação:', error)
      toast.error('Erro ao processar arquivo')
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setCurrentFile('')
    }
  }, [onImportComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: isProcessing
  })

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <FileSpreadsheet className="mr-2 text-primary-600" />
        Importar Dados Excel
      </h2>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Processando: {currentFile}
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">{progress}% concluído</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste um arquivo Excel ou clique para selecionar'}
              </p>
              <p className="text-sm text-gray-500">
                Suporta arquivos .xlsx e .xls até 1M+ de linhas
              </p>
            </div>
          </div>
        )}
      </div>

      {importStats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">Sucesso</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {importStats.success.toLocaleString()}
            </p>
          </div>

          {importStats.errors > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800">Erros</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {importStats.errors.toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {importStats.total.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Colunas esperadas:</strong></p>
        <div className="mt-2 text-xs bg-gray-50 p-3 rounded">
          data_do_periodo, periodo, duracao_do_periodo, numero_minimo_de_entregadores_regulares_na_escala, 
          tag, id_da_pessoa_entregadora, pessoa_entregadora, praca, sub_praca, origem, 
          tempo_disponivel_escalado, tempo_disponivel_absoluto, numero_de_corridas_ofertadas, 
          numero_de_corridas_aceitas, numero_de_corridas_rejeitadas, numero_de_corridas_completadas, 
          numero_de_corridas_canceladas_pela_pessoa_entregadora, numero_de_pedidos_aceitos_e_concluidos, 
          soma_das_taxas_das_corridas_aceitas
        </div>
      </div>
    </div>
  )
}
