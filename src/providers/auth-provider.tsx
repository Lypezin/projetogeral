'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'
import { adminManager } from '@/lib/admin-utils'
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
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUserPermissions = useCallback(async (userId: string) => {
    try {
      const permissions = await adminManager.getUserPermissions(userId)
      if (permissions) return permissions

      // Se não existir registro, criaremos um vazio (sem permissões) para que o admin configure depois
      return await adminManager.createDefaultPermissions(userId)
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      return null
    }
  }, [])

  const refreshPermissions = useCallback(async () => {}, [])

  useEffect(() => {
    let mounted = true
    let isInitialized = false

    const initializeAuth = async () => {
      if (isInitialized) return
      isInitialized = true

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const userPermissions = await fetchUserPermissions(currentUser.id)
          if (mounted) setPermissions(userPermissions)
        } else {
          setPermissions(null)
        }

        if (mounted) setLoading(false)
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error)
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
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const userPermissions = await fetchUserPermissions(currentUser.id)
        setPermissions(userPermissions)
      } else {
        setPermissions(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserPermissions, supabase.auth])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase.auth])

  const value = {
    user,
    permissions,
    loading,
    signIn,
    signOut,
    refreshPermissions
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
