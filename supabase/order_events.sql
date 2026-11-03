-- Fluxo da venda: uma linha por passo do pedido (criado, pago, enviado à Viasoft, nota emitida, retorno...).
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  order_number text,
  event text not null,            -- pedido_criado, pagamento_confirmado, enviado_viasoft, viasoft_emitiu, viasoft_retorno, entregue_retirado, cancelado, status_alterado, erro
  status text not null default 'ok',   -- ok | erro
  detail text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events (order_id, created_at);
create index if not exists order_events_created_idx on public.order_events (created_at desc);

alter table public.order_events enable row level security;

-- Só administradores leem. Ninguém grava pelo painel: só o servidor (service role) e o gatilho abaixo.
drop policy if exists "order_events admin read" on public.order_events;
create policy "order_events admin read" on public.order_events
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin', 'administrador')));

-- Registra sozinho a criação do pedido e cada mudança de status. Nunca bloqueia o pedido: se der erro, só não registra.
create or replace function public.log_order_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  j jsonb;
  num text;
begin
  j := to_jsonb(new);
  num := coalesce(j->>'order_number', j->>'number', j->>'code');

  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, order_number, event, detail)
    values (new.id, num, 'pedido_criado',
            'Status inicial: ' || coalesce(new.status::text, '-') || coalesce(' · entrega: ' || (j->>'delivery'), ''));
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status::text in ('cancelled', 'canceled') then
      insert into public.order_events (order_id, order_number, event, detail)
      values (new.id, num, 'cancelado', old.status::text || ' → ' || new.status::text);
    elsif new.status::text = 'delivered' then
      insert into public.order_events (order_id, order_number, event, detail)
      values (new.id, num, 'entregue_retirado', old.status::text || ' → ' || new.status::text);
    elsif old.status::text = 'pending_payment' then
      insert into public.order_events (order_id, order_number, event, detail)
      values (new.id, num, 'pagamento_confirmado', 'Pagamento aprovado · status: ' || new.status::text);
    else
      insert into public.order_events (order_id, order_number, event, detail)
      values (new.id, num, 'status_alterado', old.status::text || ' → ' || new.status::text);
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists orders_log_events on public.orders;
create trigger orders_log_events
  after insert or update of status on public.orders
  for each row execute function public.log_order_event();

-- Pedidos que já existem entram com o passo "criado" (o resto do histórico começa daqui para frente)
insert into public.order_events (order_id, order_number, event, detail, created_at)
select o.id, coalesce(to_jsonb(o)->>'order_number', to_jsonb(o)->>'number', to_jsonb(o)->>'code'),
       'pedido_criado', 'Registrado ao ativar o histórico', o.created_at
from public.orders o
where not exists (select 1 from public.order_events e where e.order_id = o.id);
