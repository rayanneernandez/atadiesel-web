-- Função segura para deletar usuários via RPC
-- Permite que um admin delete um usuário da tabela auth.users e cascade para public.profiles

create or replace function delete_user_by_id(user_id uuid)
returns void
language plpgsql
security definer -- Executa com permissões de superusuário (necessário para deletar de auth.users)
as $
begin
  -- Verifica se o usuário que está chamando a função é admin (opcional, mas recomendado)
  -- if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
  --   raise exception 'Apenas administradores podem excluir usuários.';
  -- end if;

  -- Deleta da tabela auth.users (o cascade deve cuidar do public.profiles se configurado, 
  -- mas por garantia deletamos do profile primeiro se não tiver cascade)
  delete from public.profiles where id = user_id;
  delete from auth.users where id = user_id;
end;
$;
-- Função segura para deletar usuários via RPC
-- Permite que um admin delete um usuário da tabela auth.users e cascade para public.profiles

create or replace function delete_user_by_id(user_id uuid)
returns void
language plpgsql
security definer -- Executa com permissões de superusuário (necessário para deletar de auth.users)
as $$
begin
  -- Verifica se o usuário que está chamando a função é admin (opcional, mas recomendado)
  -- if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
  --   raise exception 'Apenas administradores podem excluir usuários.';
  -- end if;

  -- Deleta da tabela auth.users (o cascade deve cuidar do public.profiles se configurado, 
  -- mas por garantia deletamos do profile primeiro se não tiver cascade)
  delete from public.profiles where id = user_id;
  delete from auth.users where id = user_id;
end;
$$;