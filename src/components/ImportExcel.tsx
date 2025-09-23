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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          </div>
          Importar Dados
        </h2>
        <p className="text-gray-600">Upload de arquivo Excel</p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Processando
              </p>
              <p className="text-gray-600 mb-4">
                {currentFile}
              </p>
              <div className="mt-4 bg-gray-200 rounded-full h-3 max-w-md mx-auto">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-gray-700 mt-3">{progress}% concluído</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                {isDragActive ? 'Solte o arquivo aqui' : 'Upload de arquivo'}
              </p>
              <p className="text-gray-600">
                Arraste e solte ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formatos: .xlsx, .xls
              </p>
            </div>
          </div>
        )}
      </div>

      {importStats && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-green-800 uppercase tracking-wide">Sucesso</span>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {importStats.success.toLocaleString()}
            </p>
          </div>

          {importStats.errors > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-sm font-semibold text-red-800 uppercase tracking-wide">Erros</span>
              </div>
              <p className="text-3xl font-bold text-red-700">
                {importStats.errors.toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">
              {importStats.total.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-blue-900">
            <p className="font-semibold text-lg mb-2">Formato do Arquivo</p>
            <p className="text-blue-800">
              Certifique-se de que seu arquivo Excel contém as colunas padrão do sistema de dados de entrega.
              O sistema detectará automaticamente as colunas corretas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
