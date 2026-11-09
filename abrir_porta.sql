-- Abrir / fechar a porta da loja autônoma pelo painel.
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run). Pode rodar de novo sem problema.
--
-- Como funciona: o painel grava o estado desejado da porta (aberta/fechada) aqui. A Raspberry Pi da catraca
-- consulta a função "porta" (Edge Function) a cada ~1,5 s e liga/desliga o relé. O Pi não precisa de IP público
-- e não recebe nenhuma chave do banco: só um token que vale para esta função.
--
--   door_state  uma linha só (id = 1): o que o painel pediu + o último sinal do Pi
--   door_log    quem abriu/fechou e quando (e fechamentos automáticos)

-- 1. Estado da porta
create table if not exists public.door_state (
  id integer primary key default 1 check (id = 1),
  desired text not null default 'closed' check (desired in ('open', 'closed')),
  open_until timestamptz,            -- a porta fecha sozinha neste horário (trava de segurança)
  requested_by uuid,
  requested_by_name text,
  requested_at timestamptz,
  pi_state text,                     -- o que o Pi diz que está fazendo agora: 'open' | 'closed'
  pi_seen_at timestamptz,            -- último contato do Pi
  updated_at timestamptz not null default now()
);
insert into public.door_state (id) values (1) on conflict (id) do nothing;

-- 2. Histórico
create table if not exists public.door_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null check (action in ('open', 'close', 'auto_close', 'pi_failsafe')),
  by_id uuid,
  by_name text,
  note text
);
create index if not exists door_log_at_idx on public.door_log (at desc);

-- 3. Ninguém mexe nas tabelas direto: só pelas funções abaixo (e a Edge Function, que usa a service role)
alter table public.door_state enable row level security;
alter table public.door_log enable row level security;

-- 4. Permissão "Abrir Porta" (Usuários > Permissões): administrador, ou permissão ligada
create or replace function public.can_open_door() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (
      lower(coalesce(p.role, '')) in ('admin', 'administrador')
      or case
        when jsonb_typeof(p.permissions->'Abrir Porta') = 'object'
          then coalesce((p.permissions->'Abrir Porta'->>'edit')::boolean, false)
        when p.permissions->'Abrir Porta' = 'true'::jsonb then true
        else false
      end
    )
  );
$$;

-- 5. Situação atual (o painel chama a cada 2 s com a aba aberta)
create or replace function public.door_get() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.door_state%rowtype; eff text; logs jsonb;
begin
  if auth.uid() is null or not public.can_open_door() then
    return jsonb_build_object('allowed', false);
  end if;
  select * into s from public.door_state where id = 1;
  -- pedido de abrir que já passou do prazo conta como fechado (o Pi também fecha, é só para a tela)
  eff := case when s.desired = 'open' and s.open_until is not null and s.open_until > now() then 'open' else 'closed' end;
  select coalesce(jsonb_agg(to_jsonb(l) order by l.at desc), '[]'::jsonb) into logs
    from (select at, action, by_name, note from public.door_log order by at desc limit 10) l;
  return jsonb_build_object(
    'allowed', true,
    'desired', eff,
    'open_until', case when eff = 'open' then s.open_until else null end,
    'requested_by_name', s.requested_by_name,
    'requested_at', s.requested_at,
    'pi_state', s.pi_state,
    'pi_seen_at', s.pi_seen_at,
    'pi_online', s.pi_seen_at is not null and s.pi_seen_at > now() - interval '15 seconds',
    'now', now(),
    'log', logs
  );
end;
$$;

-- 6. Abrir (p_open = true) ou fechar (false). Abrir sempre tem prazo: 1 a 30 minutos, padrão 5.
create or replace function public.door_set(p_open boolean, p_minutes integer default 5) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_name text; v_min integer := least(greatest(coalesce(p_minutes, 5), 1), 30); v_seen timestamptz;
begin
  if auth.uid() is null or not public.can_open_door() then
    raise exception 'Sem permissão para abrir a porta.' using errcode = '42501';
  end if;
  if p_open then
    select pi_seen_at into v_seen from public.door_state where id = 1;
    if v_seen is null or v_seen < now() - interval '15 seconds' then
      raise exception 'A Raspberry Pi da porta está sem contato. Verifique a energia e a internet da loja.' using errcode = 'P0001';
    end if;
  end if;
  select name into v_name from public.profiles where id = auth.uid();
  update public.door_state set
    desired = case when p_open then 'open' else 'closed' end,
    open_until = case when p_open then now() + make_interval(mins => v_min) else null end,
    requested_by = auth.uid(), requested_by_name = v_name, requested_at = now(), updated_at = now()
  where id = 1;
  insert into public.door_log (action, by_id, by_name, note)
  values (case when p_open then 'open' else 'close' end, auth.uid(), v_name, case when p_open then v_min || ' min' else null end);
  return public.door_get();
end;
$$;

revoke all on function public.can_open_door() from public, anon;
revoke all on function public.door_get() from public, anon;
revoke all on function public.door_set(boolean, integer) from public, anon;
grant execute on function public.can_open_door() to authenticated;
grant execute on function public.door_get() to authenticated;
grant execute on function public.door_set(boolean, integer) to authenticated;

-- Conferir
select id, desired, open_until, pi_state, pi_seen_at from public.door_state;
