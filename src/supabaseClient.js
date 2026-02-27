import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://crbqwpcwrottjveedolz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYnF3cGN3cm90dGp2ZWVkb2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTY5OTUsImV4cCI6MjA4NzA3Mjk5NX0.gcCARtE6U4x2dwYMMJkWbrfL9tVHGW2Kq8jBOdrgKmw'

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