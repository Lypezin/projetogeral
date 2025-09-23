'use client'

import { useAuth } from '@/providers/auth-provider'
import { LogOut, User, Shield, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function UserHeader() {
  const { user, permissions, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  if (!user) return null

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Informações do usuário */}
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          
          {/* Info */}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {user.email}
              </h3>
              {permissions?.is_admin && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </span>
              )}
            </div>
            
            {/* Permissões */}
            {permissions && !permissions.is_admin && (
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                Acesso a: {permissions.allowed_pracas?.join(', ') || 'Nenhuma praça'}
              </div>
            )}
            
            {permissions?.is_admin && (
              <div className="text-xs text-gray-500 mt-1">
                Acesso completo ao sistema
              </div>
            )}
          </div>
        </div>

        {/* Botão de logout */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </button>
      </div>
    </div>
  )
}
