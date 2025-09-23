'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'
import { UserPermission } from '@/lib/supabase-client'

interface AuthContextType {
  user: User | null
  permissions: UserPermission | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermission | null>(null)
  const [loading, setLoading] = useState(false) // Iniciar com false
  const supabase = createClient()

  const fetchUserPermissions = useCallback(async (userId: string) => {
    try {
      console.log('🔍 AuthProvider: Buscando permissões para user_id:', userId)

      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single()

      console.log('📊 AuthProvider: Resultado da query de permissões:', { data, error })

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ AuthProvider: Erro ao buscar permissões:', error)
        console.error('❌ AuthProvider: Detalhes do erro:', {
          message: error.message,
          code: error.code,
          status: error.status,
          details: error.details,
          hint: error.hint
        })
        return null
      }

      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ AuthProvider: Usuário não tem permissões definidas (PGRST116)')
      }

      return data || null // Retorna null se não encontrado
    } catch (error) {
      console.error('💥 AuthProvider: Erro inesperado ao buscar permissões:', error)
      return null
    }
  }, [])

  const refreshPermissions = useCallback(async () => {
    // Função simplificada - apenas para compatibilidade
    console.log('Refresh permissions chamado')
  }, [])

  useEffect(() => {
    let mounted = true
    let isInitialized = false

    console.log('🚀 AuthProvider: Iniciando useEffect')

    // Função para inicializar autenticação
    const initializeAuth = async () => {
      if (isInitialized) {
        console.log('⚠️ AuthProvider: Já inicializado, pulando...')
        return
      }

      isInitialized = true
      console.log('🔄 AuthProvider: Inicializando autenticação...')

      try {
        setLoading(true)
        
        // Aguardar um pouco para evitar race conditions
        await new Promise(resolve => setTimeout(resolve, 100))

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) {
          console.log('⚠️ AuthProvider: Componente desmontado, cancelando...')
          return
        }

        if (sessionError) {
          console.error('❌ AuthProvider: Erro ao verificar sessão:', sessionError)
          setUser(null)
          setPermissions(null)
          setLoading(false)
          return
        }

        const user = session?.user ?? null
        console.log('👤 AuthProvider: Usuário encontrado:', user?.email || 'Nenhum')

        setUser(user)

        if (user) {
          console.log('🔍 AuthProvider: Buscando permissões para:', user.email)
          const userPermissions = await fetchUserPermissions(user.id)
          if (mounted) {
            console.log('📋 AuthProvider: Permissões encontradas:', userPermissions)
            setPermissions(userPermissions)
          }
        } else {
          console.log('🚫 AuthProvider: Nenhum usuário logado')
          setPermissions(null)
        }

        if (mounted) {
          setLoading(false)
          console.log('✅ AuthProvider: Inicialização concluída')
        }
      } catch (error) {
        console.error('💥 AuthProvider: Erro na inicialização:', error)
        if (mounted) {
          setUser(null)
          setPermissions(null)
          setLoading(false)
        }
      }
    }

    // Inicializar apenas uma vez
    initializeAuth()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return

        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email)

        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('🔍 AuthProvider: Buscando permissões após mudança de estado...')
          const userPermissions = await fetchUserPermissions(session.user.id)
          if (mounted) {
            setPermissions(userPermissions)
          }
        } else {
          if (mounted) {
            setPermissions(null)
          }
        }

        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('🧹 AuthProvider: Cleanup do useEffect')
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Removido fetchUserPermissions para evitar loops

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    user,
    permissions,
    loading,
    signIn,
    signOut,
    refreshPermissions,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
