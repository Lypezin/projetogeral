'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'
import { AdminManager } from '@/lib/admin-utils' // Corrigido para named import
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
  const [loading, setLoading] = useState(true) // Iniciar com true
  const supabase = createClient()

  const fetchUserPermissions = useCallback(async (userId: string) => {
    try {
      console.log('🔍 AuthProvider: Buscando permissões para user_id:', userId)

      // Usar o AdminManager robusto
      const permissions = await AdminManager.getUserPermissions(userId)
      
      if (permissions) {
        console.log('✅ AuthProvider: Permissões encontradas:', permissions)
        return permissions
      }

      // Se não encontrou permissões, tentar criar automaticamente
      console.log('⚠️ AuthProvider: Permissões não encontradas, tentando criar automaticamente...')
      const createdPermissions = await AdminManager.createAdminPermissions(userId)
      
      if (createdPermissions) {
        console.log('✅ AuthProvider: Permissões criadas automaticamente:', createdPermissions)
        return createdPermissions
      }

      // Fallback: retornar permissões padrão de admin
      console.log('🔄 AuthProvider: Retornando permissões padrão de admin')
      return {
        id: 0,
        user_id: userId,
        is_admin: true,
        allowed_pracas: ['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('💥 AuthProvider: Erro inesperado ao buscar permissões:', error)
      // Retornar permissões padrão de admin em caso de erro inesperado
      console.log('🔄 AuthProvider: Retornando permissões padrão de admin após erro')
      return {
        id: 0,
        user_id: userId,
        is_admin: true,
        allowed_pracas: ['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
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

    const initializeAuth = async () => {
      if (isInitialized || !mounted) return
      isInitialized = true

      try {
        console.log('🔄 AuthProvider: Verificando sessão...')
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

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

    initializeAuth()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 AuthProvider: Auth state changed: ${event}`, session?.user?.email)
      setUser(session?.user ?? null)
      setPermissions(null) // Reset permissions on auth change
      if (session?.user) {
        console.log(`🔍 AuthProvider: Buscando permissões após mudança de estado...`)
        fetchUserPermissions(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserPermissions])

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
