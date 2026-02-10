import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syynlnqwuvipkhiigjtq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eW5sbnF3dXZpcGtoaWlnanRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTM2OTAsImV4cCI6MjA4MzUyOTY5MH0.7H3lhl1_ULLvywEiy0LJWmgXxn6vNWXzffLKSxgkLPk'

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO CRÍTICO: Supabase URL ou Key não encontrados. Verifique seu arquivo .env e reinicie o terminal.', {
    url: supabaseUrl,
    key: supabaseKey ? 'Definida' : 'Ausente'
  });
}

// Fallback para evitar crash (tela branca), mas as requisições falharão até corrigir o .env
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder',
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)