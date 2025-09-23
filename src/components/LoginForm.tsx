'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { Eye, EyeOff, LogIn, Lock, Mail, TrendingUp, BarChart3, Users, Shield } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function LoginForm() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        toast.error('Credenciais inválidas. Verifique seu email e senha.')
      } else {
        toast.success('Login realizado com sucesso!')
      }
    } catch (error) {
      toast.error('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-6 shadow-lg">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard Analytics
            </h1>
            <p className="text-gray-600 text-lg">
              Análise inteligente de dados de entrega
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-600">
                Acesse sua conta para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                  E-mail
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-600 transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-600 transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="Digite sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Entrar no Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Security Note */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium">Acesso seguro e monitorado</p>
                  <p className="text-gray-600 mt-1">
                    Entre em contato com o administrador para obter credenciais
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10 text-center text-white px-8 max-w-lg">
          <div className="mb-8">
            <TrendingUp className="w-16 h-16 mx-auto mb-6 text-blue-200" />
            <h2 className="text-4xl font-bold mb-4">
              Análise Poderosa
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Transforme dados de entrega em insights estratégicos com dashboards inteligentes e relatórios em tempo real
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-center text-left">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gráficos Interativos</h3>
                <p className="text-blue-100 text-sm">Visualize tendências e padrões</p>
              </div>
            </div>

            <div className="flex items-center text-left">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Controle de Acesso</h3>
                <p className="text-blue-100 text-sm">Permissões personalizadas por região</p>
              </div>
            </div>

            <div className="flex items-center text-left">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Performance Otimizada</h3>
                <p className="text-blue-100 text-sm">Suporte a milhões de registros</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-blue-200 text-sm">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">1M+</div>
              <div className="text-blue-200 text-sm">Registros</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-blue-200 text-sm">Suporte</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
