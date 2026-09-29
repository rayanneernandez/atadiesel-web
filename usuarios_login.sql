-- =====================================================================
-- CADASTRO DE USUÁRIOS E SENHAS PELO PAINEL (versão corrigida)
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run).
-- Já inclui o conteúdo de senha_temporaria.sql (pode rodar mesmo se já rodou aquele).
--
-- O que resolve:
--   * Usuário criado em "Novo Usuário" não conseguia entrar (conta de login incompleta)
--   * "Alterar Senha" dizia sucesso mas a senha não funcionava
--   * Alterar Senha agora também CONSERTA usuários criados com defeito
-- Segurança: só quem é Administrador consegue chamar as funções.
-- =====================================================================

-- 1. Marca de senha provisória
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- 2. Verifica se quem chamou é administrador
create or replace function public.is_admin_caller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role) in ('admin', 'administrador')
  );
$$;

-- 3. Garante que a conta de login (auth) está completa e com a senha informada.
--    Cria a conta se não existir; se existir, corrige campos que impedem o login.
create or replace function public._admin_upsert_auth_user(
  p_user_id uuid,
  p_email text,
  p_password text,
  p_name text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid := p_user_id;
  v_email text := lower(trim(p_email));
  v_hash text := extensions.crypt(p_password, extensions.gen_salt('bf'));
  v_instance uuid := coalesce(
    (select instance_id from auth.users where instance_id is not null limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
begin
  if v_id is null then
    select id into v_id from auth.users where lower(email) = v_email;
  end if;

  if v_id is not null and exists (select 1 from auth.users where id = v_id) then
    update auth.users set
      email                      = coalesce(email, v_email),
      encrypted_password         = v_hash,
      email_confirmed_at         = coalesce(email_confirmed_at, now()),
      aud                        = coalesce(aud, 'authenticated'),
      role                       = coalesce(role, 'authenticated'),
      instance_id                = coalesce(instance_id, v_instance),
      raw_app_meta_data          = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
      confirmation_token         = coalesce(confirmation_token, ''),
      recovery_token             = coalesce(recovery_token, ''),
      email_change               = coalesce(email_change, ''),
      email_change_token_new     = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      phone_change               = coalesce(phone_change, ''),
      phone_change_token         = coalesce(phone_change_token, ''),
      reauthentication_token     = coalesce(reauthentication_token, ''),
      banned_until               = null,
      updated_at                 = now()
    where id = v_id;
  else
    v_id := coalesce(v_id, gen_random_uuid());
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      v_instance, v_id, 'authenticated', 'authenticated', v_email, v_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_name, 'role', p_role), now(), now(),
      '', '', '', '', '', '', '', ''
    );
  end if;

  -- Identidade de e-mail (sem ela o login por senha pode falhar)
  if not exists (select 1 from auth.identities where user_id = v_id and provider = 'email') then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text, 'email',
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public._admin_upsert_auth_user(uuid, text, text, text, text) from public, anon, authenticated;

-- 4. NOVO USUÁRIO: cria conta de login + perfil, com senha provisória
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_permissions jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin_caller() then
    raise exception 'Apenas administradores podem cadastrar usuários.';
  end if;
  if coalesce(length(p_password), 0) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Este e-mail já está cadastrado.';
  end if;

  v_id := public._admin_upsert_auth_user(null, v_email, p_password, p_name, p_role);

  insert into public.profiles (id, name, email, role, permissions, must_change_password)
  values (v_id, p_name, v_email, p_role, p_permissions, true)
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    permissions = coalesce(excluded.permissions, public.profiles.permissions),
    must_change_password = true;

  return v_id;
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text, jsonb) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, jsonb) to authenticated;

-- 5. ALTERAR SENHA: grava a senha de verdade e conserta a conta se estiver com defeito
create or replace function public.admin_set_user_password(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.is_admin_caller() then
    raise exception 'Apenas administradores podem alterar senhas.';
  end if;
  if coalesce(length(p_password), 0) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Usuário não encontrado.';
  end if;

  perform public._admin_upsert_auth_user(v_profile.id, v_profile.email, p_password, v_profile.name, v_profile.role);

  update public.profiles set must_change_password = true where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_password(uuid, text) from public, anon;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;

-- 6. Usuário limpa a própria marca de senha provisória (modal do primeiro login)
create or replace function public.clear_must_change_password()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;
