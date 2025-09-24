// ===============================================
// UTILITÁRIOS ROBUSTOS PARA SISTEMA DE ADMIN
// ===============================================

import { createClient } from './supabase-client'

export interface AdminPermissions {
  id: number
  user_id: string
  is_admin: boolean
  allowed_pracas: string[]
  created_at: string
  updated_at: string
}

export class AdminManager {
  private supabase = createClient()

  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_permissions')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle()

      return data?.is_admin ?? false
    } catch (error) {
      console.error('Erro ao verificar admin:', error)
      return false
    }
  }

  async getUserPermissions(userId: string): Promise<AdminPermissions | null> {
    try {
      const { data } = await this.supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      return data as AdminPermissions | null
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      return null
    }
  }

  async createDefaultPermissions(userId: string): Promise<AdminPermissions | null> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        is_admin: false,
        allowed_pracas: []
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar permissões:', error)
      return null
    }

    return data as AdminPermissions
  }
}

export const adminManager = new AdminManager()
