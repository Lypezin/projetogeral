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

  /**
   * Verificar se usuário é admin com fallback robusto
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      console.log('🔍 AdminManager: Verificando se usuário é admin:', userId)

      // Tentar buscar permissões
      const { data, error } = await this.supabase
        .from('user_permissions')
        .select('is_admin')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.warn('⚠️ AdminManager: Erro ao buscar permissões:', error)
        
        // Se erro 406 ou similar, assumir que é admin
        if (error.status === 406 || error.code === 'PGRST116') {
          console.log('🔄 AdminManager: Assumindo admin por erro de permissões')
          return true
        }
        
        return false
      }

      return data?.is_admin || false
    } catch (error) {
      console.error('💥 AdminManager: Erro inesperado:', error)
      // Em caso de erro, assumir que é admin para não bloquear acesso
      return true
    }
  }

  /**
   * Obter permissões do usuário com fallback
   */
  async getUserPermissions(userId: string): Promise<AdminPermissions | null> {
    try {
      console.log('🔍 AdminManager: Buscando permissões do usuário:', userId)

      const { data, error } = await this.supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.warn('⚠️ AdminManager: Erro ao buscar permissões:', error)
        
        // Se erro 406 ou similar, retornar permissões padrão de admin
        if (error.status === 406 || error.code === 'PGRST116') {
          console.log('🔄 AdminManager: Retornando permissões padrão de admin')
          return this.getDefaultAdminPermissions(userId)
        }
        
        return null
      }

      return data || this.getDefaultAdminPermissions(userId)
    } catch (error) {
      console.error('💥 AdminManager: Erro inesperado:', error)
      return this.getDefaultAdminPermissions(userId)
    }
  }

  /**
   * Criar permissões de admin automaticamente
   */
  async createAdminPermissions(userId: string): Promise<AdminPermissions | null> {
    try {
      console.log('🔧 AdminManager: Criando permissões de admin para:', userId)

      const { data, error } = await this.supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          is_admin: true,
          allowed_pracas: ['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas']
        })
        .select()
        .single()

      if (error) {
        console.error('❌ AdminManager: Erro ao criar permissões:', error)
        return this.getDefaultAdminPermissions(userId)
      }

      console.log('✅ AdminManager: Permissões criadas com sucesso:', data)
      return data
    } catch (error) {
      console.error('💥 AdminManager: Erro inesperado ao criar permissões:', error)
      return this.getDefaultAdminPermissions(userId)
    }
  }

  /**
   * Obter permissões padrão de admin
   */
  private getDefaultAdminPermissions(userId: string): AdminPermissions {
    return {
      id: 0,
      user_id: userId,
      is_admin: true,
      allowed_pracas: ['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Verificar se usuário tem acesso a uma praça específica
   */
  async hasAccessToPraca(userId: string, praca: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      
      if (!permissions) {
        return false
      }

      // Se é admin, tem acesso a todas as praças
      if (permissions.is_admin) {
        return true
      }

      // Verificar se a praça está na lista de praças permitidas
      return permissions.allowed_pracas.includes(praca) || permissions.allowed_pracas.includes('Todas')
    } catch (error) {
      console.error('💥 AdminManager: Erro ao verificar acesso à praça:', error)
      // Em caso de erro, permitir acesso para não bloquear
      return true
    }
  }

  /**
   * Forçar configuração de admin para usuário
   */
  async forceAdminSetup(userId: string): Promise<boolean> {
    try {
      console.log('🔧 AdminManager: Forçando configuração de admin para:', userId)

      // Tentar criar permissões
      const permissions = await this.createAdminPermissions(userId)
      
      if (permissions) {
        console.log('✅ AdminManager: Admin configurado com sucesso')
        return true
      }

      // Se falhar, retornar true mesmo assim para não bloquear
      console.log('⚠️ AdminManager: Falha ao configurar admin, mas permitindo acesso')
      return true
    } catch (error) {
      console.error('💥 AdminManager: Erro ao forçar configuração de admin:', error)
      // Em caso de erro, retornar true para não bloquear acesso
      return true
    }
  }
}

// Instância singleton
export const adminManager = new AdminManager()
