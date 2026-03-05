-- Script de Correção Geral (Executar no SQL Editor do Supabase)

-- 1. Garante colunas de permissão
alter table public.profiles 
add column if not exists permissions jsonb default '{}'::jsonb,
add column if not exists app_access boolean default false;

-- 2. Corrige Policies (Permissões de Acesso)
alter table public.profiles enable row level security;

-- Permite leitura para todos os autenticados (necessário para login verificar permissões)
drop policy if exists "Profiles visiveis para autenticados" on public.profiles;
create policy "Profiles visiveis para autenticados" 
on public.profiles for select 
to authenticated 
using (true);

-- Permite atualização apenas para o próprio usuário ou admins
drop policy if exists "Usuarios atualizam proprio perfil" on public.profiles;
create policy "Usuarios atualizam proprio perfil" 
on public.profiles for update 
to authenticated 
using (auth.uid() = id);

drop policy if exists "Admins atualizam qualquer perfil" on public.profiles;
create policy "Admins atualizam qualquer perfil" 
on public.profiles for update 
to authenticated 
using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'administrador'))
);

-- 3. Tenta corrigir o usuário Gestor (se existir)
-- ATENÇÃO: Se o comando abaixo falhar, significa que o usuário não existe no Auth ainda.
-- Tente criar o usuário novamente se necessário, ou ignore se o erro for apenas "nenhuma linha afetada".

-- 3.1 Confirma o e-mail automaticamente (Corrige erro de login se pendente)
update auth.users 
set email_confirmed_at = now(), 
    encrypted_password = crypt('123456', gen_salt('bf')) 
where email = 'gestor@atadisel.com';

-- 3.2 Cria ou Atualiza o Perfil com Permissão de Checklist
-- Usamos um INSERT com ON CONFLICT simples
insert into public.profiles (id, email, role, permissions, app_access)
select 
  id, 
  email, 
  'client', 
  '{"Checklist": true}'::jsonb, 
  false
from auth.users 
where email = 'gestor@atadisel.com'
on conflict (id) do update
set permissions = '{"Checklist": true}'::jsonb;

-- 4. Corrige Função de Novo Usuário (Evita erros futuros)
create or replace function public.handle_new_user() 
returns trigger as $
begin
  insert into public.profiles (id, full_name, email, role, permissions, app_access)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    '{}'::jsonb,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$ language plpgsql security definer;
