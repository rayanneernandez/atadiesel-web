-- EMERGÊNCIA: CORREÇÃO DE LOGIN (Execute no Supabase SQL Editor)
-- Este script força a remoção de TODAS as políticas conhecidas e libera o acesso.

-- 1. Desabilitar RLS imediatamente para parar os erros
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas possíveis (Lista completa encontrada no projeto)
DROP POLICY IF EXISTS "Profiles visiveis para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins atualizam qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Allow Select for Authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow Update for Self" ON public.profiles;
DROP POLICY IF EXISTS "Allow Update for Admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow Insert for Authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Delete Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow Read All Authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow Update" ON public.profiles;
DROP POLICY IF EXISTS "Allow Insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow Delete" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Read_All_Safe" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Update_Safe" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Insert_Safe" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Delete_Safe" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Read_All_Safe" ON public.profiles;

-- 3. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Criar UMA ÚNICA política de LEITURA simples (Sem recursão)
CREATE POLICY "Emergency_Read_All"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Criar política simples de ATUALIZAÇÃO (Apenas o próprio usuário)
CREATE POLICY "Emergency_Update_Self"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- 6. Teste de verificação (Deve retornar 1 linha se funcionar)
SELECT count(*) as total_perfis FROM public.profiles;