import * as XLSX from 'xlsx'
import { supabase, DadosEmpresa } from './supabase'

// Função para converter tempo HH:MM:SS para segundos ou manter formato
const parseTime = (timeStr: string): string => {
  if (!timeStr || timeStr.trim() === '') return '00:00:00'
  
  // Se já está no formato correto, retorna
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    return timeStr
  }
  
  // Se é um número (Excel pode converter para número decimal)
  if (typeof timeStr === 'number') {
    const totalSeconds = Math.round(timeStr * 24 * 60 * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  return timeStr.toString()
}

// Função para validar e converter linha do Excel
const validateAndConvertRow = (row: any): DadosEmpresa | null => {
  try {
    // Validações básicas
    if (!row.data_do_periodo || !row.pessoa_entregadora) {
      return null
    }

    return {
      data_do_periodo: row.data_do_periodo,
      periodo: row.periodo || '',
      duracao_do_periodo: parseTime(row.duracao_do_periodo),
      numero_minimo_de_entregadores_regulares_na_escala: parseInt(row.numero_minimo_de_entregadores_regulares_na_escala) || 0,
      tag: row.tag || '',
      id_da_pessoa_entregadora: row.id_da_pessoa_entregadora?.toString() || '',
      pessoa_entregadora: row.pessoa_entregadora || '',
      praca: row.praca || '',
      sub_praca: row.sub_praca || '',
      origem: row.origem || '',
      tempo_disponivel_escalado: row.tempo_disponivel_escalado || '',
      tempo_disponivel_absoluto: parseTime(row.tempo_disponivel_absoluto),
      numero_de_corridas_ofertadas: parseInt(row.numero_de_corridas_ofertadas) || 0,
      numero_de_corridas_aceitas: parseInt(row.numero_de_corridas_aceitas) || 0,
      numero_de_corridas_rejeitadas: parseInt(row.numero_de_corridas_rejeitadas) || 0,
      numero_de_corridas_completadas: parseInt(row.numero_de_corridas_completadas) || 0,
      numero_de_corridas_canceladas_pela_pessoa_entregadora: parseInt(row.numero_de_corridas_canceladas_pela_pessoa_entregadora) || 0,
      numero_de_pedidos_aceitos_e_concluidos: parseInt(row.numero_de_pedidos_aceitos_e_concluidos) || 0,
      soma_das_taxas_das_corridas_aceitas: parseFloat(row.soma_das_taxas_das_corridas_aceitas) || 0
    }
  } catch (error) {
    console.error('Erro ao converter linha:', error)
    return null
  }
}

// Função para processar arquivo Excel
export const processExcelFile = async (file: File): Promise<DadosEmpresa[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Pega a primeira planilha
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Converte para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Valida e converte os dados
        const validData: DadosEmpresa[] = []
        
        for (const row of jsonData) {
          const convertedRow = validateAndConvertRow(row)
          if (convertedRow) {
            validData.push(convertedRow)
          }
        }
        
        resolve(validData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

// Função para importar dados em lotes (batch) para não sobrecarregar o Supabase
export const importDataInBatches = async (
  data: DadosEmpresa[], 
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<{ success: number; errors: number; errorDetails: string[] }> => {
  const BATCH_SIZE = 1000 // Tamanho do lote para não extrapolar limites do Supabase
  const total = data.length
  let success = 0
  let errors = 0
  const errorDetails: string[] = []
  
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    
    try {
      console.log(`📦 Inserindo lote ${Math.floor(i/BATCH_SIZE) + 1} com ${batch.length} registros na tabela delivery_data...`)
      
      const { error } = await supabase
        .from('delivery_data')
        .insert(batch)
      
      if (error) {
        errors += batch.length
        errorDetails.push(`Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`)
        console.error('❌ Erro no lote:', error)
      } else {
        success += batch.length
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} inserido com sucesso!`)
      }
    } catch (error) {
      errors += batch.length
      errorDetails.push(`Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${error}`)
      console.error('Erro no lote:', error)
    }
    
    // Chama callback de progresso
    if (onProgress) {
      const current = Math.min(i + BATCH_SIZE, total)
      const progress = Math.round((current / total) * 100)
      onProgress(progress, current, total)
    }
    
    // Pequena pausa entre lotes para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return { success, errors, errorDetails }
}

// Função para verificar se a tabela existe e obter informações
export const checkTable = async () => {
  try {
    // Tenta fazer uma query simples para verificar se a tabela existe
    const { data, error } = await supabase
      .from('delivery_data')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Erro ao verificar tabela:', error)
      return { exists: false, error: error.message }
    }
    
    return { exists: true, error: null }
  } catch (error) {
    console.error('Erro ao verificar tabela:', error)
    return { exists: false, error: error.toString() }
  }
}

// Função para obter estatísticas dos dados
export const getDataStats = async () => {
  try {
    console.log('🔍 Tentando obter estatísticas da tabela delivery_data...')
    
    const { data, error } = await supabase
      .from('delivery_data')
      .select(`
        numero_de_corridas_ofertadas,
        numero_de_corridas_aceitas,
        numero_de_corridas_rejeitadas,
        numero_de_corridas_completadas
      `)
    
    if (error) {
      console.error('❌ Erro ao consultar delivery_data:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log('📝 Tabela delivery_data existe mas está vazia')
      return {
        totalOfertadas: 0,
        totalAceitas: 0,
        totalRejeitadas: 0,
        totalCompletadas: 0,
        totalRegistros: 0
      }
    }
    
    console.log(`✅ Encontrados ${data.length} registros na tabela delivery_data`)
    
    const stats = {
      totalOfertadas: 0,
      totalAceitas: 0,
      totalRejeitadas: 0,
      totalCompletadas: 0,
      totalRegistros: data.length
    }
    
    data.forEach(row => {
      stats.totalOfertadas += row.numero_de_corridas_ofertadas || 0
      stats.totalAceitas += row.numero_de_corridas_aceitas || 0
      stats.totalRejeitadas += row.numero_de_corridas_rejeitadas || 0
      stats.totalCompletadas += row.numero_de_corridas_completadas || 0
    })
    
    return stats
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error)
    throw error
  }
}
