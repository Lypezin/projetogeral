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

  // Debug: mostrar informações de permissões
  console.log('AdminPanel - User:', user?.email)
  console.log('AdminPanel - Permissions:', permissions)
  console.log('AdminPanel - Is Admin:', permissions?.is_admin)

  // Verificar se o usuário é admin
  if (!permissions?.is_admin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Painel Administrativo - Acesso Negado
            </h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p><strong>Usuário:</strong> {user?.email || 'Não logado'}</p>
              <p><strong>Permissões:</strong> {permissions ? JSON.stringify(permissions) : 'Nenhuma'}</p>
              <p><strong>Is Admin:</strong> {permissions?.is_admin ? 'Sim' : 'Não'}</p>
              <p className="mt-2">
                <strong>Solução:</strong> Execute este SQL no Supabase para se tornar admin:
              </p>
              <code className="block bg-yellow-100 p-2 rounded mt-2 text-xs">
                INSERT INTO user_permissions (user_id, is_admin)<br/>
                SELECT id, TRUE<br/>
                FROM auth.users<br/>
                WHERE email = '{user?.email || 'SEU_EMAIL'}'<br/>
                ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE;
              </code>
            </div>
          </div>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      {/* Header Moderno */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Painel Administrativo
            </h2>
            <p className="text-gray-600 mt-1">
              Gerencie usuários e permissões de acesso
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-200">
            <Users className="w-4 h-4 mr-2" />
            {users.length} usuário(s)
          </span>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-6">
        {users.map((userItem) => (
          <div key={userItem.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              {/* Informações do usuário */}
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{userItem.email}</h3>
                    {userItem.permissions?.is_admin && (
                      <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-full text-xs font-bold border border-purple-300">
                        <Shield className="w-3 h-3 mr-1" />
                        ADMINISTRADOR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      ID: {userItem.id.slice(0, 8)}...
                    </span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      Cadastrado: {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center space-x-2">
                {editingUser === userItem.id ? (
                  <>
                    <button
                      onClick={() => savePermissions(userItem.id)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Salvar alterações"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
                      title="Cancelar edição"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(userItem)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Editar permissões"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </button>
                    {userItem.permissions && (
                      <button
                        onClick={() => deletePermissions(userItem.id)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Remover permissões"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Formulário de edição */}
            {editingUser === userItem.id && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-6">
                  {/* Admin toggle */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Tipo de Acesso</h4>
                          <p className="text-gray-600 text-sm">Defina o nível de permissão do usuário</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id={`admin-${userItem.id}`}
                            checked={editForm.is_admin}
                            onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-700"></div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {editForm.is_admin ? 'Administrador' : 'Usuário'}
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 p-4 rounded-xl bg-white border border-blue-100">
                      <p className="text-sm text-gray-700">
                        <strong>Administrador:</strong> Acesso completo a todos os dados e painel de gerenciamento
                      </p>
                    </div>
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
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    Permissões Atuais
                  </h4>

                  <div className="space-y-4">
                    {userItem.permissions.is_admin ? (
                      <div className="flex items-center p-4 bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-xl">
                        <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center mr-4">
                          <Shield className="w-5 h-5 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-purple-900 uppercase tracking-wide">Administrador</p>
                          <p className="text-sm text-purple-800">Acesso completo a todos os dados e painel de gerenciamento</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center p-4 bg-white border border-gray-200 rounded-xl">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Usuário Regional</p>
                            <p className="text-sm text-gray-600">
                              {userItem.permissions.allowed_pracas.length > 0
                                ? `${userItem.permissions.allowed_pracas.length} praça(s) permitida(s)`
                                : 'Nenhuma praça permitida'
                              }
                            </p>
                          </div>
                        </div>

                        {userItem.permissions.allowed_pracas.length > 0 && (
                          <div className="p-4 bg-white border border-gray-200 rounded-xl">
                            <p className="text-sm font-medium text-gray-700 mb-3">Praças permitidas:</p>
                            <div className="flex flex-wrap gap-2">
                              {userItem.permissions.allowed_pracas.map((praca) => (
                                <span
                                  key={praca}
                                  className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg border border-blue-200"
                                >
                                  {praca}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Os usuários aparecerão aqui automaticamente após fazerem login no sistema.
              Você pode então configurar as permissões de cada um.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-lg mx-auto">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm">ℹ️</span>
                </div>
                <h4 className="text-lg font-medium text-blue-900">Como funciona?</h4>
              </div>
              <div className="text-left space-y-3 text-sm text-blue-800">
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">1</span>
                  </div>
                  <p>Usuários aparecem automaticamente quando fazem login</p>
                </div>
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">2</span>
                  </div>
                  <p>Clique em "Editar" para configurar permissões</p>
                </div>
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">3</span>
                  </div>
                  <p>Escolha entre Admin (acesso total) ou Usuário Regional (praças específicas)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="mt-8 p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
            <span className="text-2xl">🚀</span>
          </div>
          <div>
            <h4 className="text-xl font-bold text-blue-900 mb-1">Como Usar o Sistema</h4>
            <p className="text-blue-700">Guia completo para gerenciar permissões</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-blue-100 rounded-xl p-4">
              <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-blue-200 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-blue-700">1</span>
                </div>
                Configurar Admin
              </h5>
              <p className="text-sm text-blue-800">
                Você já está configurado como administrador e pode gerenciar outros usuários
              </p>
            </div>

            <div className="bg-white border border-green-100 rounded-xl p-4">
              <h5 className="font-semibold text-green-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-green-700">2</span>
                </div>
                Adicionar Usuários
              </h5>
              <p className="text-sm text-green-800">
                Usuários aparecem automaticamente quando fazem login no sistema
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-purple-100 rounded-xl p-4">
              <h5 className="font-semibold text-purple-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-purple-200 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-purple-700">3</span>
                </div>
                Definir Permissões
              </h5>
              <p className="text-sm text-purple-800">
                Escolha entre Admin (acesso total) ou Usuário Regional (praças específicas)
              </p>
            </div>

            <div className="bg-white border border-orange-100 rounded-xl p-4">
              <h5 className="font-semibold text-orange-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-orange-200 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-orange-700">4</span>
                </div>
                Sistema Filtra Automaticamente
              </h5>
              <p className="text-sm text-orange-800">
                Cada usuário vê apenas os dados das praças permitidas nos gráficos e métricas
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 mt-1">
              <span className="text-green-600 text-sm">✅</span>
            </div>
            <div>
              <h5 className="font-semibold text-green-900 mb-2">Sistema Pronto!</h5>
              <p className="text-sm text-green-800 mb-3">
                O painel administrativo está totalmente funcional. Você pode:
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Gerenciar usuários e permissões</li>
                <li>• Controlar acesso por região</li>
                <li>• Monitorar dados de forma segura</li>
                <li>• Sistema de auditoria completo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
