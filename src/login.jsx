import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from './assets/logo-atadiesel-branco.png';
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

      // 2. Verificar permissões (Consultando tabela profiles)
      // Usamos o ID do usuário retornado pelo login para garantir integridade com RLS
      const user = data.user;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, permissions, app_access')
        .eq('id', user.id)
        .single();

      if (profileError) {
         console.error('Erro detalhado ao buscar perfil (RLS/Conexão):', profileError);
         // Se não encontrar perfil, nega acesso
         await supabase.auth.signOut();
         // Mensagem amigável para o usuário, mas erro real no console
         throw new Error('Perfil de usuário não encontrado. Contate o suporte.');
      }
      
      // Verifica se tem acesso (Admin, Acesso Total ou Permissões Específicas)
      // Atualizado para permitir acesso a todos exceto clientes e entregadores (salvo com permissão explícita)
      const role = profileData?.role?.toLowerCase() || '';
      const isAdmin = role === 'admin' || role === 'administrador';
      const hasAppAccess = profileData?.app_access === true;
      const hasPermissions = profileData?.permissions && Object.keys(profileData.permissions).length > 0;

      const restrictedRoles = ['client', 'cliente', 'driver', 'entregador'];
      const isRestrictedRole = restrictedRoles.includes(role);
      
      console.log('Login Check:', { email, role, isRestrictedRole, isAdmin, hasAppAccess, hasPermissions });

      if (isRestrictedRole && !isAdmin && !hasAppAccess && !hasPermissions) {
        await supabase.auth.signOut();
        throw new Error('Acesso negado: Usuário não possui permissão de acesso ao painel.');
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
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-slate-950">
      {/* Lado da marca (só em telas grandes) */}
      <aside className="relative hidden lg:flex items-stretch justify-center overflow-hidden px-12 py-14 xl:px-20 2xl:px-28 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-blue-400/10" />
        <div className="pointer-events-none absolute bottom-28 right-16 h-40 w-40 rounded-full border-2 border-white/15" />
        <div className="relative flex w-full max-w-xl flex-col justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Painel administrativo</p>
          <div>
            <img src={logo} alt="Atadiesel" className="w-72 h-auto object-contain mb-10" />
            <h2 className="text-4xl font-bold leading-tight">Tudo da sua operação em um só lugar.</h2>
            <p className="mt-4 text-lg text-white/75">Produtos, pedidos, entregas e a loja autônoma, com a gestão da Atadiesel.</p>
          </div>
          <p className="text-sm text-white/60">© 2026 Atadiesel</p>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-white">
        <div style={{ zoom: 'calc(0.85 / var(--ui-scale, 1))' }} className="w-full max-w-md">
          <div className="lg:hidden mb-8 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-5">
            <img src={logo} alt="Atadiesel" className="w-56 max-w-full h-auto object-contain mx-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Bem-vindo de volta!</h1>
            <p className="mt-2 text-slate-500">Acesse o painel administrativo da Atadiesel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="voce@atadiesel.com.br"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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

          <p className="mt-10 text-center text-xs text-slate-400 lg:hidden">© 2026 Atadiesel</p>
        </div>
      </main>
    </div>
  );
};

export default LoginScreen;
