import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from './assets/logo.png';
import { supabase } from './supabaseClient';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Login no Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) throw authError;

      // 2. Verificar se é Administrador (Consultando tabela profiles)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email.trim())
        .single();

      if (profileError) {
         // Se não encontrar perfil, nega acesso
         await supabase.auth.signOut();
         throw new Error('Perfil de usuário não encontrado.');
      }
      
      // Verifica se a role é exatamente 'admin'
      if (profileData?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Acesso negado: Usuário não possui permissão de administrador.');
      }

      if (onLogin) onLogin();

    } catch (err) {
      console.error("Erro login:", err);
      let msg = 'Erro ao fazer login.';
      if (err.message.includes('Invalid login')) msg = 'Email ou senha incorretos.';
      if (err.message.includes('Email not confirmed')) msg = 'Email não confirmado. Verifique sua caixa de entrada.';
      if (err.message.includes('Acesso negado')) msg = err.message;
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-slate-900/50 p-6 text-center border-b border-slate-700">
          <div className="w-72 mx-auto flex items-center justify-center mb-4">
            <img src={logo} alt="Atadisel" className="w-full h-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h1>
          <p className="text-slate-400">Acesse o painel administrativo da Atadisel</p>
        </div>
 
        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="admin@atadisel.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-blue-500 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-900/30 p-4 text-center border-t border-slate-700">
          <p className="text-xs text-slate-500">
            © 2026 Atadisel Global IA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;