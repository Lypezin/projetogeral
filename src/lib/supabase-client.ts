import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dggswtzjozluleqlckdg.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3N3dHpqb3psdWxlcWxja2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMzMjMsImV4cCI6MjA3NDE0OTMyM30.tSo7qK713vy5z5Kz1RFq61TlLK3Zj1Pqoz-RpRCE4q4'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

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

export interface UserPermission {
  id?: number
  user_id: string
  allowed_pracas: string[]
  is_admin: boolean
  created_at?: string
  updated_at?: string
}
