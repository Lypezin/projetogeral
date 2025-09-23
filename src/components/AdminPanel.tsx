'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase-client'
import { Users, Shield, MapPin, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { UserPermission } from '@/lib/supabase-client'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
}

interface UserWithPermissions extends User {
  permissions?: UserPermission
}

export default function AdminPanel() {
  const { user, permissions } = useAuth()
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [availablePracas, setAvailablePracas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    allowed_pracas: string[]
    is_admin: boolean
  }>({ allowed_pracas: [], is_admin: false })
  const supabase = createClient()

  // Verificar se o usuário é admin
  if (!permissions?.is_admin) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="text-center py-8">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-gray-600">
            Você precisa de permissões de administrador para acessar este painel.
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadUsers(), loadAvailablePracas()])
    setLoading(false)
  }

  const loadUsers = async () => {
    try {
      // Buscar usuários (requer permissões especiais no Supabase)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        // Fallback: listar apenas usuários com permissões
        const { data: permissionsData, error: permError } = await supabase
          .from('user_permissions')
          .select('*')
        
        if (permError) {
          toast.error('Erro ao carregar usuários')
          return
        }
        
        setUsers(permissionsData.map(perm => ({
          id: perm.user_id,
          email: 'Usuario com permissões',
          created_at: perm.created_at,
          permissions: perm
        })))
        return
      }

      // Buscar permissões dos usuários
      const { data: permissionsData, error: permError } = await supabase
        .from('user_permissions')
        .select('*')

      if (permError) {
        console.warn('Erro ao carregar permissões:', permError)
      }

      // Combinar dados
      const usersWithPermissions = authUsers.users
        .filter(authUser => authUser.email) // Filtrar usuários sem email
        .map(authUser => ({
          id: authUser.id,
          email: authUser.email!,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          permissions: permissionsData?.find(p => p.user_id === authUser.id)
        }))

      setUsers(usersWithPermissions)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    }
  }

  const loadAvailablePracas = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_data')
        .select('praca')
        .not('praca', 'is', null)
        .neq('praca', '')

      if (error) {
        console.warn('Erro ao carregar praças:', error)
        return
      }

      const uniquePracas = Array.from(new Set(data.map(item => item.praca))).sort()
      setAvailablePracas(uniquePracas)
    } catch (error) {
      console.error('Erro ao carregar praças:', error)
    }
  }

  const startEditing = (user: UserWithPermissions) => {
    setEditingUser(user.id)
    setEditForm({
      allowed_pracas: user.permissions?.allowed_pracas || [],
      is_admin: user.permissions?.is_admin || false
    })
  }

  const cancelEditing = () => {
    setEditingUser(null)
    setEditForm({ allowed_pracas: [], is_admin: false })
  }

  const savePermissions = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          allowed_pracas: editForm.allowed_pracas,
          is_admin: editForm.is_admin,
          updated_at: new Date().toISOString()
        })

      if (error) {
        toast.error('Erro ao salvar permissões')
        return
      }

      toast.success('Permissões atualizadas com sucesso!')
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      toast.error('Erro inesperado ao salvar permissões')
    }
  }

  const deletePermissions = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja remover as permissões deste usuário?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        toast.error('Erro ao remover permissões')
        return
      }

      toast.success('Permissões removidas com sucesso!')
      await loadUsers()
    } catch (error) {
      toast.error('Erro inesperado ao remover permissões')
    }
  }

  const togglePraca = (praca: string) => {
    const currentPracas = editForm.allowed_pracas
    const newPracas = currentPracas.includes(praca)
      ? currentPracas.filter(p => p !== praca)
      : [...currentPracas, praca]
    
    setEditForm({ ...editForm, allowed_pracas: newPracas })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="mr-3 h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">
            Painel Administrativo
          </h2>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
          {users.length} usuário(s)
        </span>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-4">
        {users.map((userItem) => (
          <div key={userItem.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              {/* Informações do usuário */}
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{userItem.email}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>ID: {userItem.id.slice(0, 8)}...</span>
                    {userItem.permissions?.is_admin && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center space-x-2">
                {editingUser === userItem.id ? (
                  <>
                    <button
                      onClick={() => savePermissions(userItem.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Salvar"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(userItem)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar permissões"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {userItem.permissions && (
                      <button
                        onClick={() => deletePermissions(userItem.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover permissões"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Formulário de edição */}
            {editingUser === userItem.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  {/* Admin toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`admin-${userItem.id}`}
                      checked={editForm.is_admin}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`admin-${userItem.id}`} className="ml-2 text-sm text-gray-900">
                      Administrador (acesso completo)
                    </label>
                  </div>

                  {/* Seleção de praças */}
                  {!editForm.is_admin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Praças permitidas:
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {availablePracas.map((praca) => (
                          <label key={praca} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editForm.allowed_pracas.includes(praca)}
                              onChange={() => togglePraca(praca)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-900 truncate" title={praca}>
                              {praca}
                            </span>
                          </label>
                        ))}
                      </div>
                      {editForm.allowed_pracas.length === 0 && (
                        <p className="text-sm text-amber-600 mt-2">
                          ⚠️ Usuário não terá acesso a nenhuma praça
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Permissões atuais */}
            {editingUser !== userItem.id && userItem.permissions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {userItem.permissions.is_admin ? (
                    <span className="flex items-center">
                      <Shield className="w-4 h-4 mr-1 text-purple-600" />
                      Acesso administrativo completo
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-blue-600" />
                      {userItem.permissions.allowed_pracas.length > 0
                        ? `${userItem.permissions.allowed_pracas.length} praça(s): ${userItem.permissions.allowed_pracas.slice(0, 3).join(', ')}${userItem.permissions.allowed_pracas.length > 3 ? '...' : ''}`
                        : 'Nenhuma praça permitida'
                      }
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600">
              Os usuários aparecerão aqui após fazerem login no sistema.
            </p>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Instruções:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Administradores</strong> têm acesso completo a todos os dados</li>
          <li>• <strong>Usuários regulares</strong> só veem dados das praças permitidas</li>
          <li>• Usuários sem permissões não conseguem acessar o dashboard</li>
          <li>• Execute o SQL em <code>database-setup.sql</code> para configurar as tabelas</li>
        </ul>
      </div>
    </div>
  )
}
