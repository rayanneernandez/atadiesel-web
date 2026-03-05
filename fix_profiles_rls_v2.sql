-- Fix RLS Policies for Profiles to prevent 500 Errors (Recursion)

-- 1. Disable RLS temporarily to ensure we can clean up
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on profiles to clear conflicts
DROP POLICY IF EXISTS "Profiles visiveis para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins atualizam qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE, NON-RECURSIVE policies

-- Allow SELECT for ALL authenticated users (Safe and prevents recursion)
CREATE POLICY "Allow Select for Authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow UPDATE for Self (Safe)
CREATE POLICY "Allow Update for Self"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow UPDATE for Admins (Using a non-recursive check if possible, or simplified)
-- The SELECT policy above (USING true) ensures that the subquery (select role from profiles) 
-- will NOT trigger a recursive check because it hits the SELECT policy, which returns true immediately.
CREATE POLICY "Allow Update for Admins"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role in ('admin', 'administrador')
  )
);

-- 5. Allow INSERT (for registration)
CREATE POLICY "Allow Insert for Authenticated"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);