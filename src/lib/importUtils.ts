import * as XLSX from 'xlsx'
import { supabase, DadosEmpresa } from './supabase'

// Função para converter data serial do Excel para formato YYYY-MM-DD
const parseExcelDate = (dateValue: any): string => {
  if (!dateValue || dateValue === null || dateValue === undefined) {
    return new Date().toISOString().split('T')[0] // Data atual como fallback
  }
  
  // Se é um número (data serial do Excel)
  if (typeof dateValue === 'number') {
    // Excel serial date: número de dias desde 1900-01-01 (com ajuste para bug do Excel)
    const excelEpoch = new Date(1900, 0, 1)
    const days = dateValue - 2 // Ajuste para o bug do Excel (conta 1900 como ano bissexto)
    const resultDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
    return resultDate.toISOString().split('T')[0]
  }
  
  // Se é string, tenta converter
  const dateString = dateValue.toString().trim()
  
  // Se já está no formato YYYY-MM-DD, retorna
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Tenta parse da string
  try {
    const parsedDate = new Date(dateString)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0]
    }
  } catch (e) {
    // Ignora erro
  }
  
  // Fallback para data atual
  return new Date().toISOString().split('T')[0]
}

// Função para converter tempo HH:MM:SS para segundos ou manter formato
const parseTime = (timeStr: any): string => {
  // Se é null, undefined ou vazio, retorna padrão
  if (!timeStr || timeStr === null || timeStr === undefined) return '00:00:00'
  
  // Se é um número (Excel pode converter para número decimal)
  if (typeof timeStr === 'number') {
    // Se o número é 0 ou muito pequeno, retorna padrão
    if (timeStr === 0) return '00:00:00'
    
    const totalSeconds = Math.round(timeStr * 24 * 60 * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Converte para string primeiro
  const timeString = timeStr.toString().trim()
  
  // Se está vazio após conversão, retorna padrão
  if (!timeString || timeString === '' || timeString === 'null' || timeString === 'undefined') {
    return '00:00:00'
  }
  
  // Se já está no formato correto, retorna
  if (timeString.includes(':')) {
    // Valida se o formato está correto (HH:MM ou HH:MM:SS)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
      // Se é HH:MM, adiciona :00
      if (timeString.split(':').length === 2) {
        return timeString + ':00'
      }
      return timeString
    }
  }
  
  // Se chegou aqui e não é reconhecido, retorna padrão
  console.log(`⚠️ Valor de tempo não reconhecido: "${timeString}", usando 00:00:00`)
  return '00:00:00'
}

// Função para converter string para número seguro
const safeParseInt = (value: any): number => {
  if (!value || value === null || value === undefined) return 0
  const num = parseInt(value.toString().replace(/[^\d-]/g, ''))
  return isNaN(num) ? 0 : num
}

// Função para converter string para float seguro
const safeParseFloat = (value: any): number => {
  if (!value || value === null || value === undefined) return 0
  const str = value.toString().replace(/[^\d.-]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

// Função para converter para string segura
const safeToString = (value: any): string => {
  if (!value || value === null || value === undefined) return ''
  return value.toString().trim()
}

// Função para validar e converter linha do Excel
const validateAndConvertRow = (row: any): DadosEmpresa | null => {
  try {
    // Validações básicas mais permissivas
    const dataValid = row.data_do_periodo !== null && row.data_do_periodo !== undefined && row.data_do_periodo !== ''
    const pessoaValid = row.pessoa_entregadora !== null && row.pessoa_entregadora !== undefined && row.pessoa_entregadora !== ''
    
    if (!dataValid || !pessoaValid) {
      console.log('❌ Linha inválida - falta dados obrigatórios')
      return null
    }

    const convertedRow = {
      data_do_periodo: parseExcelDate(row.data_do_periodo),
      periodo: safeToString(row.periodo),
      duracao_do_periodo: parseTime(row.duracao_do_periodo),
      numero_minimo_de_entregadores_regulares_na_escala: safeParseInt(row.numero_minimo_de_entregadores_regulares_na_escala),
      tag: safeToString(row.tag),
      id_da_pessoa_entregadora: safeToString(row.id_da_pessoa_entregadora),
      pessoa_entregadora: safeToString(row.pessoa_entregadora),
      praca: safeToString(row.praca),
      sub_praca: safeToString(row.sub_praca),
      origem: safeToString(row.origem),
      tempo_disponivel_escalado: safeToString(row.tempo_disponivel_escalado),
      tempo_disponivel_absoluto: parseTime(row.tempo_disponivel_absoluto),
      numero_de_corridas_ofertadas: safeParseInt(row.numero_de_corridas_ofertadas),
      numero_de_corridas_aceitas: safeParseInt(row.numero_de_corridas_aceitas),
      numero_de_corridas_rejeitadas: safeParseInt(row.numero_de_corridas_rejeitadas),
      numero_de_corridas_completadas: safeParseInt(row.numero_de_corridas_completadas),
      numero_de_corridas_canceladas_pela_pessoa_entregadora: safeParseInt(row.numero_de_corridas_canceladas_pela_pessoa_entregadora),
      numero_de_pedidos_aceitos_e_concluidos: safeParseInt(row.numero_de_pedidos_aceitos_e_concluidos),
      soma_das_taxas_das_corridas_aceitas: safeParseFloat(row.soma_das_taxas_das_corridas_aceitas)
    }

    // Log para debugging da conversão de data
    if (typeof row.data_do_periodo === 'number') {
      console.log(`📅 Data convertida: ${row.data_do_periodo} → ${convertedRow.data_do_periodo}`)
    }
    
    // Log para debugging de campos de tempo problemáticos
    if (!row.duracao_do_periodo || row.duracao_do_periodo === '') {
      console.log(`⚠️ duracao_do_periodo vazio, usando: ${convertedRow.duracao_do_periodo}`)
    }
    if (!row.tempo_disponivel_absoluto || row.tempo_disponivel_absoluto === '') {
      console.log(`⚠️ tempo_disponivel_absoluto vazio, usando: ${convertedRow.tempo_disponivel_absoluto}`)
    }
    
    console.log('✅ Linha convertida com sucesso')
    return convertedRow
  } catch (error) {
    console.error('❌ Erro ao converter linha:', error, 'Dados da linha:', row)
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
      
      // Filtra registros null/inválidos antes de inserir
      const validBatch = batch.filter(record => record !== null)
      
      if (validBatch.length === 0) {
        console.log(`⚠️ Lote ${Math.floor(i/BATCH_SIZE) + 1} não tem registros válidos, pulando...`)
        continue
      }
      
      const { error } = await supabase
        .from('delivery_data')
        .insert(validBatch)
      
      if (error) {
        // Se der erro, tenta inserir registro por registro para identificar o problemático
        console.error('❌ Erro no lote completo, tentando inserção individual...')
        console.error('❌ Erro original:', error)
        
        let batchSuccess = 0
        let batchErrors = 0
        
        for (let j = 0; j < validBatch.length; j++) {
          try {
            const { error: singleError } = await supabase
              .from('delivery_data')
              .insert([validBatch[j]])
            
            if (singleError) {
              batchErrors++
              console.error(`❌ Erro no registro ${j + 1}:`, singleError.message)
              console.error(`❌ Dados problemáticos:`, validBatch[j])
            } else {
              batchSuccess++
            }
          } catch (singleErr) {
            batchErrors++
            console.error(`❌ Erro inesperado no registro ${j + 1}:`, singleErr)
          }
        }
        
        success += batchSuccess
        errors += batchErrors
        errorDetails.push(`Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${batchSuccess} sucessos, ${batchErrors} erros`)
        
      } else {
        success += validBatch.length
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} inserido com sucesso! (${validBatch.length} registros)`)
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
    return { exists: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Função para testar inserção de um único registro
export const testSingleInsert = async () => {
  try {
    console.log('🧪 Testando inserção de um único registro...')
    
    const testRecord = {
      data_do_periodo: '2024-01-01',
      periodo: 'manhã',
      duracao_do_periodo: '08:00:00',
      numero_minimo_de_entregadores_regulares_na_escala: 5,
      tag: 'teste',
      id_da_pessoa_entregadora: '123',
      pessoa_entregadora: 'João Teste',
      praca: 'São Paulo',
      sub_praca: 'Centro',
      origem: 'App',
      tempo_disponivel_escalado: '480',
      tempo_disponivel_absoluto: '08:00:00',
      numero_de_corridas_ofertadas: 10,
      numero_de_corridas_aceitas: 8,
      numero_de_corridas_rejeitadas: 2,
      numero_de_corridas_completadas: 7,
      numero_de_corridas_canceladas_pela_pessoa_entregadora: 1,
      numero_de_pedidos_aceitos_e_concluidos: 7,
      soma_das_taxas_das_corridas_aceitas: 45.50
    }
    
    console.log('📋 Dados do teste:', testRecord)
    
    const { data, error } = await supabase
      .from('delivery_data')
      .insert([testRecord])
      .select()
    
    if (error) {
      console.error('❌ Erro no teste:', error)
      console.error('❌ Detalhes:', error.details)
      console.error('❌ Código:', error.code)
      console.error('❌ Hint:', error.hint)
      return { success: false, error }
    }
    
    console.log('✅ Teste bem-sucedido:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    return { success: false, error }
  }
}

// Função para limpar todos os dados da tabela
export const clearAllData = async () => {
  try {
    console.log('🗑️ Iniciando limpeza de todos os dados...')
    
    // Primeiro, vamos verificar quantos registros existem
    const { count } = await supabase
      .from('delivery_data')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Encontrados ${count} registros para deletar`)
    
    if (count === 0) {
      console.log('✅ Banco já está vazio!')
      return { success: true, message: 'Banco já estava vazio' }
    }
    
    // Deleta todos os registros usando uma condição que sempre é verdadeira
    // Usamos created_at ou qualquer campo que sempre existe
    const { error } = await supabase
      .from('delivery_data')
      .delete()
      .not('data_do_periodo', 'is', null) // Remove todos que têm data_do_periodo (ou seja, todos)
    
    if (error) {
      console.error('❌ Erro ao limpar dados:', error)
      throw error
    }
    
    console.log('✅ Todos os dados foram removidos com sucesso!')
    return { success: true, message: `${count} registros removidos com sucesso` }
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error)
    throw error
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
