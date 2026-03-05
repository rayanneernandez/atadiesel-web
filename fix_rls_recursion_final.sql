-- FIX 500 ERROR AND LOGIN LOOP (FINAL & COMPLETE)
-- This script resets all policies, ensures columns exist, and syncs missing profiles.

-- 0. Ensure necessary columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_access boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- 1. Disable RLS temporarily to clean up
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (Clean Slate)
DROP POLICY IF EXISTS "Profiles visiveis para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins atualizam qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
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

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE, ROBUST policies

-- READ: Allow ALL authenticated users to read ALL profiles.
-- This allows the login screen to check the user's role without recursion errors.
CREATE POLICY "Allow Read All Authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Users update own, Admins update all
CREATE POLICY "Allow Update"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'administrador', 'Admin')
);

-- INSERT: Allow self-registration
CREATE POLICY "Allow Insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- DELETE: Only Admins
CREATE POLICY "Allow Delete"
ON public.profiles FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'administrador', 'Admin')
);

-- 5. AUTO-FIX: Create missing profiles for existing users
-- If a user exists in auth.users but not in public.profiles, create them as 'client'
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

-- 6. Ensure Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
