-- =====================================================================
-- DIAGNÓSTICO DE LOGIN (só lê, não altera nada)
-- Troque o e-mail e a senha abaixo se for testar outro usuário.
-- =====================================================================

select
  p.id                                   as profile_id,
  u.id                                   as auth_id,
  (u.id is not null)                     as existe_no_auth,
  (p.id = u.id)                          as ids_batem,
  u.email_confirmed_at                   as email_confirmado_em,
  u.banned_until                         as bloqueado_ate,
  (u.encrypted_password is not null and u.encrypted_password <> '') as tem_senha,
  (u.encrypted_password = extensions.crypt('GT@2026', u.encrypted_password)) as senha_confere,
  u.updated_at                           as auth_atualizado_em,
  (select count(*) from auth.identities i where i.user_id = u.id) as identidades,
  (select pg_get_functiondef(oid) from pg_proc where proname = 'set_user_password' limit 1) as funcao_set_user_password
from public.profiles p
full join auth.users u on lower(u.email) = lower(p.email)
where lower(coalesce(p.email, u.email)) = 'valber.figueredo@globaltera.com.br';
