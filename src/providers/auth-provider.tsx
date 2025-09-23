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
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao buscar permissões:', error)
        return null
      }

      return data || null // Retorna null se não encontrado
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      return null
    }
  }, [])

  const refreshPermissions = useCallback(async () => {
    // Função simplificada - apenas para compatibilidade
    console.log('Refresh permissions chamado')
  }, [])

  useEffect(() => {
    let mounted = true

    // Buscar sessão inicial de forma mais segura
    const initializeAuth = async () => {
      try {
        // Primeiro verificar se há sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          console.error('Erro ao verificar sessão:', sessionError)
          setUser(null)
          setPermissions(null)
          setLoading(false)
          return
        }

        const user = session?.user ?? null
        setUser(user)

        if (user) {
          console.log('Usuário logado:', user.email)
          // Buscar permissões
          const userPermissions = await fetchUserPermissions(user.id)
          if (mounted) {
            setPermissions(userPermissions)
          }
        } else {
          console.log('Nenhum usuário logado')
          setPermissions(null)
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error)
        if (mounted) {
          setUser(null)
          setPermissions(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.email)

        setUser(session?.user ?? null)

        if (session?.user) {
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
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserPermissions]) // Manter dependência necessária

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
