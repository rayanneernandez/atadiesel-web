-- Pausar retiradas enquanto há entrega em andamento. Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run). Pode rodar de novo sem problema.
-- Quem fica no estoque é o mesmo que faz as entregas: ao sair para entregar, ele clica em "Pausar retiradas" no painel.
-- Enquanto a pausa estiver ativa, os horários de retirada que caem no período da pausa ficam indisponíveis no app
-- (e o servidor recusa pedido novo nesses horários). Retiradas JÁ agendadas não são canceladas.

-- 1. Uma linha só (id = 1) com o estado da pausa
create table if not exists public.delivery_pause (
  id integer primary key default 1 check (id = 1),
  active boolean not null default false,
  started_at timestamptz,
  until timestamptz,                      -- fim da pausa (a pausa também expira sozinha neste horário)
  minutes integer,                        -- duração escolhida ao pausar (ex.: 90)
  started_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.delivery_pause (id) values (1) on conflict (id) do nothing;

-- 2. Permissão 'Pausar Retirada' (mesmo modelo dos Cupons/Entregas):
--    admin, ou permissão true (acesso total), ou { view, edit, delete } com edit = true
create or replace function public.pause_perm(p_action text default 'edit') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (
      lower(coalesce(p.role, '')) in ('admin', 'administrador')
      or case
        when jsonb_typeof(p.permissions->'Pausar Retirada') = 'object'
          then coalesce((p.permissions->'Pausar Retirada'->>p_action)::boolean, p_action = 'view')
        when p.permissions->'Pausar Retirada' = 'true'::jsonb then true
        else false
      end
    )
  );
$$;

-- 3. Segurança: qualquer usuário logado lê (o app/servidor precisam saber); só quem tem a permissão pausa/retoma
alter table public.delivery_pause enable row level security;

drop policy if exists delivery_pause_select on public.delivery_pause;
drop policy if exists delivery_pause_insert on public.delivery_pause;
drop policy if exists delivery_pause_update on public.delivery_pause;
create policy delivery_pause_select on public.delivery_pause for select to authenticated using (true);
create policy delivery_pause_insert on public.delivery_pause for insert to authenticated with check (public.pause_perm('edit'));
create policy delivery_pause_update on public.delivery_pause for update to authenticated using (public.pause_perm('edit')) with check (public.pause_perm('edit'));
