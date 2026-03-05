-- NUCLEAR FIX FOR RLS RECURSION (EXECUTE NO SUPABASE SQL EDITOR)
-- Este script remove TODAS as políticas da tabela 'profiles' dinamicamente.
-- Isso resolve o erro "infinite recursion" causado por políticas antigas ou invisíveis.

DO $$
DECLARE
    pol record;
BEGIN
    -- Loop para encontrar todas as políticas na tabela profiles
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        -- Remove cada política encontrada
        RAISE NOTICE 'Removendo política antiga: %', pol.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 1. Desabilita e Habilita RLS para limpar estado
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Cria política de LEITURA TOTAL (Sem Recursão)
-- "USING (true)" garante que não há consulta ao banco, quebrando o loop.
CREATE POLICY "Profiles_Read_All_Safe"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Cria política de ATUALIZAÇÃO (Admin ou Próprio Usuário)
-- A subquery aqui é segura APENAS porque a política de LEITURA acima é "true".
CREATE POLICY "Profiles_Update_Safe"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid() 
  OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'administrador', 'Admin')
);

-- 4. Cria política de INSERÇÃO (Cadastro)
CREATE POLICY "Profiles_Insert_Safe"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 5. Cria política de DELEÇÃO (Apenas Admin)
CREATE POLICY "Profiles_Delete_Safe"
ON public.profiles FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'administrador', 'Admin')
);

-- 6. Garante colunas necessárias
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_access boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- 7. Cria perfis faltantes para usuários existentes
INSERT INTO public.profiles (id, email, role, app_access, permissions)
SELECT 
  id, 
  email, 
  'client', 
  false, 
  '{}'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 8. Verifica Trigger de Novos Usuários
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, permissions, app_access)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    '{}'::jsonb,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();