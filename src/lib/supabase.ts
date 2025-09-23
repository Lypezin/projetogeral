// REDIRECIONANDO PARA O CLIENTE SINGLETON
// Este arquivo foi descontinuado para evitar múltiplas instâncias
// Use: import { createClient } from '@/lib/supabase-client'

export { createClient } from './supabase-client'

// Re-exportar tipos para compatibilidade
export interface DadosEmpresa {
  id?: number
  data_do_periodo: string
  periodo: string
  duracao_do_periodo: string
  numero_minimo_de_entregadores_regulares_na_escala: number
  tag: string
  id_da_pessoa_entregadora: string
  pessoa_entregadora: string
  praca: string
  sub_praca: string
  origem: string
  tempo_disponivel_escalado: string
  tempo_disponivel_absoluto: string
  numero_de_corridas_ofertadas: number
  numero_de_corridas_aceitas: number
  numero_de_corridas_rejeitadas: number
  numero_de_corridas_completadas: number
  numero_de_corridas_canceladas_pela_pessoa_entregadora: number
  numero_de_pedidos_aceitos_e_concluidos: number
  soma_das_taxas_das_corridas_aceitas: number
  created_at?: string
}

// Tipos para os dados da empresa
export interface DadosEmpresa {
  id?: number
  data_do_periodo: string
  periodo: string
  duracao_do_periodo: string
  numero_minimo_de_entregadores_regulares_na_escala: number
  tag: string
  id_da_pessoa_entregadora: string
  pessoa_entregadora: string
  praca: string
  sub_praca: string
  origem: string
  tempo_disponivel_escalado: string
  tempo_disponivel_absoluto: string
  numero_de_corridas_ofertadas: number
  numero_de_corridas_aceitas: number
  numero_de_corridas_rejeitadas: number
  numero_de_corridas_completadas: number
  numero_de_corridas_canceladas_pela_pessoa_entregadora: number
  numero_de_pedidos_aceitos_e_concluidos: number
  soma_das_taxas_das_corridas_aceitas: number
  created_at?: string
}
